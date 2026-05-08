package audio

import (
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"os"
)

type wavFacts struct {
	DurationSeconds float64
	Channels        int
	SampleRateHz    int
	BitDepth        int
	PeakDBFS        float64
	SilenceRatio    float64
	DCOffset        float64
}

func parseWAV(path string) (wavFacts, error) {
	file, err := os.Open(path)
	if err != nil {
		return wavFacts{}, err
	}
	defer func() { _ = file.Close() }()

	header := make([]byte, 12)
	if _, err := io.ReadFull(file, header); err != nil {
		return wavFacts{}, err
	}
	if string(header[0:4]) != "RIFF" || string(header[8:12]) != "WAVE" {
		return wavFacts{}, fmt.Errorf("not a RIFF/WAVE file")
	}

	var channels int
	var sampleRate int
	var bitDepth int
	var dataSize uint32
	var dataOffset int64

	for {
		chunk := make([]byte, 8)
		if _, err := io.ReadFull(file, chunk); err != nil {
			return wavFacts{}, fmt.Errorf("missing fmt/data chunk: %w", err)
		}
		chunkID := string(chunk[0:4])
		chunkSize := binary.LittleEndian.Uint32(chunk[4:8])
		switch chunkID {
		case "fmt ":
			body := make([]byte, chunkSize)
			if _, err := io.ReadFull(file, body); err != nil {
				return wavFacts{}, err
			}
			if len(body) < 16 {
				return wavFacts{}, fmt.Errorf("fmt chunk too short")
			}
			channels = int(binary.LittleEndian.Uint16(body[2:4]))
			sampleRate = int(binary.LittleEndian.Uint32(body[4:8]))
			bitDepth = int(binary.LittleEndian.Uint16(body[14:16]))
		case "data":
			dataSize = chunkSize
			offset, err := file.Seek(0, io.SeekCurrent)
			if err != nil {
				return wavFacts{}, err
			}
			dataOffset = offset
			goto done
		default:
			if _, err := file.Seek(int64(chunkSize), io.SeekCurrent); err != nil {
				return wavFacts{}, err
			}
		}
		if chunkSize%2 == 1 {
			if _, err := file.Seek(1, io.SeekCurrent); err != nil {
				return wavFacts{}, err
			}
		}
	}

done:
	if channels <= 0 || sampleRate <= 0 || bitDepth <= 0 || dataSize == 0 {
		return wavFacts{}, fmt.Errorf("incomplete wav facts")
	}

	bytesPerSample := bitDepth / 8
	if bytesPerSample <= 0 {
		return wavFacts{}, fmt.Errorf("unsupported wav bit depth")
	}
	frameSize := channels * bytesPerSample
	duration := float64(dataSize) / float64(frameSize*sampleRate)

	if _, err := file.Seek(dataOffset, io.SeekStart); err != nil {
		return wavFacts{}, err
	}
	samplesToInspect := int(math.Min(float64(dataSize/uint32(bytesPerSample)), 48000*30))
	peak, silence, dc := inspectPCM(file, samplesToInspect, bitDepth)

	return wavFacts{
		DurationSeconds: duration,
		Channels:        channels,
		SampleRateHz:    sampleRate,
		BitDepth:        bitDepth,
		PeakDBFS:        ampToDBFS(peak),
		SilenceRatio:    silence,
		DCOffset:        dc,
	}, nil
}

func inspectPCM(reader io.Reader, sampleCount int, bitDepth int) (float64, float64, float64) {
	if sampleCount <= 0 {
		return 0, 1, 0
	}

	var peak float64
	var silent int
	var sum float64
	buf := make([]byte, 4)
	for i := 0; i < sampleCount; i++ {
		var sample float64
		switch bitDepth {
		case 8:
			if _, err := io.ReadFull(reader, buf[:1]); err != nil {
				return peak, float64(silent) / float64(i+1), sum / float64(i+1)
			}
			sample = (float64(buf[0]) - 128) / 128
		case 16:
			if _, err := io.ReadFull(reader, buf[:2]); err != nil {
				return peak, float64(silent) / float64(i+1), sum / float64(i+1)
			}
			sample = float64(int16(binary.LittleEndian.Uint16(buf[:2]))) / 32768
		case 24:
			if _, err := io.ReadFull(reader, buf[:3]); err != nil {
				return peak, float64(silent) / float64(i+1), sum / float64(i+1)
			}
			value := int32(buf[0]) | int32(buf[1])<<8 | int32(buf[2])<<16
			if value&0x800000 != 0 {
				value |= ^0xffffff
			}
			sample = float64(value) / 8388608
		default:
			return 0, 0, 0
		}
		abs := math.Abs(sample)
		if abs > peak {
			peak = abs
		}
		if abs < 0.002 {
			silent++
		}
		sum += sample
	}
	return peak, float64(silent) / float64(sampleCount), sum / float64(sampleCount)
}

func ampToDBFS(amp float64) float64 {
	if amp <= 0 {
		return -120
	}
	return math.Round(20*math.Log10(amp)*10) / 10
}

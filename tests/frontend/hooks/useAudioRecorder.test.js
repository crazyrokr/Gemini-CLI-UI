import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../../../src/hooks/useAudioRecorder.js';

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
  });

  it('starts recording when start() is called', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it('sets error when getUserMedia rejects', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe('Permission denied');
  });

  it('stops recording when stop() is called', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRecording).toBe(false);
  });

  it('clears audioBlob and error on reset()', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('initial state has no recording, no blob, no error', () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

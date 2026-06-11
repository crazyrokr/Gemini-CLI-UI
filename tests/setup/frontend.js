import '@testing-library/jest-dom';

const isJsdom = typeof window !== 'undefined';

if (isJsdom) {
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  global.ResizeObserver = MockResizeObserver;

  class MockAudioContext {
    createBuffer = vi.fn();
    createBufferSource = vi.fn(() => ({ start: vi.fn(), connect: vi.fn() }));
    createGain = vi.fn(() => ({ connect: vi.fn(), gain: { value: 0.5 } }));
    destination = {};
    sampleRate = 44100;
    state = 'running';
    resume = vi.fn();
  }
  global.AudioContext = MockAudioContext;

  class MockMediaRecorder {
    start = vi.fn();
    stop = vi.fn();
    ondataavailable = null;
    onstop = null;
    onerror = null;
    state = 'inactive';
  }
  global.MediaRecorder = MockMediaRecorder;
  global.MediaRecorder.isTypeSupported = vi.fn(() => true);

  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  });

  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  global.IntersectionObserver = MockIntersectionObserver;

  class MockWebSocket {
    send = vi.fn();
    close = vi.fn();
    onopen = null;
    onmessage = null;
    onclose = null;
    onerror = null;
  }
  global.WebSocket = MockWebSocket;

  beforeEach(() => {
    localStorage.clear();
  });
}

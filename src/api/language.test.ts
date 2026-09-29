import { api } from '../utils/api';
import { fetchLanguages } from './language';

jest.mock('../utils/api', () => ({ api: jest.fn() }));
jest.mock('../store/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));

const mockApi = api as jest.Mock;

beforeEach(() => mockApi.mockReset());

describe('fetchLanguages', () => {
  it('returns the languages from the server', async () => {
    const languages = [{ id: 'l1', code: 'hindi', label: 'Hindi', nativeLabel: null }];
    mockApi.mockResolvedValue({ languages });

    await expect(fetchLanguages()).resolves.toEqual(languages);
  });

  // An empty list here would be cached as a real answer and could get saved
  // as the user's choice, so failures must reject instead.
  it('rejects when the request fails', async () => {
    mockApi.mockRejectedValue(new Error('Network request failed'));
    await expect(fetchLanguages()).rejects.toThrow('Network request failed');
  });

  it('rejects when the response has no languages array', async () => {
    mockApi.mockResolvedValue({ message: 'oops' });
    await expect(fetchLanguages()).rejects.toThrow('Invalid languages response');
  });
});

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TranslatorService } from './translator.service.js';
import { NvidiaClientService } from './nvidia-client.service.js';

describe('TranslatorService', () => {
  let service: TranslatorService;
  let nvidiaClient: { chatCompletion: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    nvidiaClient = {
      chatCompletion: vi.fn(),
    };
    service = new TranslatorService(nvidiaClient as unknown as NvidiaClientService);
  });

  it('should translate text successfully on first attempt', async () => {
    nvidiaClient.chatCompletion.mockResolvedValue('Hello, world!');

    const result = await service.translate('Hola, mundo!', 'English', 'es');
    expect(result).toBe('Hello, world!');
    expect(nvidiaClient.chatCompletion).toHaveBeenCalledTimes(1);
  });

  it('should retry with explicit prompt if model returns near-identical text for different language', async () => {
    const arabicOriginal =
      'مرحباً، قمت بالطلب قبل أربعة أيام وكان من المفترض أن يصل الطرد أمس.';
    const arabicEcho =
      'مرحبا، قمت بالطلب قبل أربعة أيام وكان من المفترض أن يصل الطرد أمس.';
    const englishTranslated =
      'Hello, I placed the order four days ago and the parcel was supposed to arrive yesterday.';

    // First attempt echoes Arabic text, second attempt returns English translation
    nvidiaClient.chatCompletion
      .mockResolvedValueOnce(arabicEcho)
      .mockResolvedValueOnce(englishTranslated);

    const result = await service.translate(arabicOriginal, 'English', 'ar');
    expect(result).toBe(englishTranslated);
    expect(nvidiaClient.chatCompletion).toHaveBeenCalledTimes(2);

    const secondCall = nvidiaClient.chatCompletion.mock.calls[1];
    expect(secondCall[0][0].content).toContain(
      'The input is in a different language — do not return it unchanged, you must translate it into English.',
    );
  });

  it('should not retry if target language is the same as source language', async () => {
    const englishText = 'Hello, I need help.';
    nvidiaClient.chatCompletion.mockResolvedValue(englishText);

    const result = await service.translate(englishText, 'English', 'en');
    expect(result).toBe(englishText);
    expect(nvidiaClient.chatCompletion).toHaveBeenCalledTimes(1);
  });
});

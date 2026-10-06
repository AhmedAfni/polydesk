import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslatorService } from '../src/ai/translator.service.js';
import { NvidiaClientService } from '../src/ai/nvidia-client.service.js';
import { AppModule } from '../src/app.module.js';
import { ThrottlerGuard } from '@nestjs/throttler';

// Ensure .env is loaded
try {
  process.loadEnvFile?.(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
  );
} catch {
  try {
    process.loadEnvFile?.();
  } catch {
    // Ignore if already loaded
  }
}

describe('Translation Arabic-Echo Bug Regression Integration', () => {
  let translatorService: TranslatorService;
  let nvidiaClientService: NvidiaClientService;
  let mockChatCompletion: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    mockChatCompletion = vi.fn();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NvidiaClientService)
      .useValue({
        chatCompletion: mockChatCompletion,
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    translatorService = moduleFixture.get<TranslatorService>(TranslatorService);
    nvidiaClientService = moduleFixture.get<NvidiaClientService>(NvidiaClientService);
  });

  beforeEach(() => {
    mockChatCompletion.mockReset();
  });

  it('detects near-identical Arabic text returned on first attempt, retries, and returns the real translation', async () => {
    const arabicInput =
      'مرحباً، قمت بالطلب قبل أربعة أيام وكان من المفترض أن يصل الطرد أمس.';
    const expectedRealTranslation =
      'Hello, I placed the order four days ago and the package was supposed to arrive yesterday.';

    // Simulate the Arabic-echo bug:
    // First call returns near-identical text (>90% similarity)
    // Second call (retry with explicit prompt) returns the real translated English
    mockChatCompletion
      .mockResolvedValueOnce(
        'مرحبا، قمت بالطلب قبل أربعة أيام وكان من المفترض أن يصل الطرد أمس.',
      )
      .mockResolvedValueOnce(expectedRealTranslation);

    const result = await translatorService.translate(
      arabicInput,
      'en',
      'ar',
    );

    // 1. Confirm TranslatorService triggered a retry
    expect(mockChatCompletion).toHaveBeenCalledTimes(2);

    // 2. Confirm first call had the standard translation prompt
    const firstCallArgs = mockChatCompletion.mock.calls[0];
    expect(firstCallArgs[0][0].content).toContain(
      'Translate it into en, regardless of what language it is written in',
    );
    expect(firstCallArgs[0][1].content).toBe(arabicInput);

    // 3. Confirm second call had the explicit retry prompt with warning
    const secondCallArgs = mockChatCompletion.mock.calls[1];
    expect(secondCallArgs[0][0].content).toContain('CRITICAL INSTRUCTION');
    expect(secondCallArgs[0][0].content).toContain(
      'Do not return the original text unchanged',
    );
    expect(secondCallArgs[0][1].content).toContain(
      'The input is in a different language — do not return it unchanged',
    );

    // 4. Confirm the final output is the REAL translation, NOT the echoed Arabic text
    expect(result).toBe(expectedRealTranslation);
    expect(result).not.toBe(arabicInput);
  });

  it('does NOT trigger a retry when the translation model returns a valid distinct translation on the first attempt', async () => {
    const frenchInput = 'Bonjour, je souhaite modifier mon adresse de livraison.';
    const validEnglishTranslation =
      'Hello, I would like to change my delivery address.';

    mockChatCompletion.mockResolvedValueOnce(validEnglishTranslation);

    const result = await translatorService.translate(
      frenchInput,
      'en',
      'fr',
    );

    // Should only call chatCompletion once when similarity is low
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    expect(result).toBe(validEnglishTranslation);
  });

  it('does NOT trigger a retry when source and target languages are identical even with 100% similarity', async () => {
    const englishInput = 'Hello, this message is already in English.';

    // Mock returns identical text (100% similarity)
    mockChatCompletion.mockResolvedValueOnce(englishInput);

    const result = await translatorService.translate(
      englishInput,
      'en',
      'en',
    );

    // Even though similarity is 1.0, isSameLanguage prevents an unnecessary retry loop
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    expect(result).toBe(englishInput);
  });
});

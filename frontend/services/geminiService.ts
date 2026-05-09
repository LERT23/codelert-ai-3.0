import { GoogleGenAI, Type, Modality } from '@google/genai';
import { ChatMessage, ChatAttachment, ContextFile, ThemeSettings } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const upscaleImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: 'Upscale this image, enhance quality, make it high resolution HDR, improve details.' }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image returned');
  } catch (e: any) {
    console.error('Upscale error:', e);
    throw new Error(e.message || 'Failed to upscale image');
  }
};

const getSupportedMimeType = (mimeType: string): string | null => {
  const normalized = mimeType.toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  const supported = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
  ];
  if (supported.includes(normalized)) return normalized;
  return null;
};

export const generateChatStreamResponse = async function* (
  messages: ChatMessage[],
  newPrompt: string,
  attachments: ChatAttachment[] = [],
  contextFiles: ContextFile[] = [],
  projectStructure: string = '',
  language: 'UA' | 'EN' = 'EN',
  settings?: ThemeSettings,
  editHistory?: string
) {
  try {
    const model = 'gemini-2.5-flash';
    
    const langInstruction = language === 'UA' ? 'Відповідай українською мовою.' : 'Respond in English.';
    
    let systemInstruction = `Your name is Code-Lert (CodeLert AI 3.0). You are an expert programming assistant capable of analyzing up to 2 million lines of code.
Спілкуйся тією ж мовою, якою до тебе звертається користувач (автоматично визначай мову з його повідомлень).

ПРАВИЛА ПОВЕДІНКИ:
1. Надавай чіткі та зрозумілі відповіді. Пояснюй свій код, але уникай надмірної "води". Твої відповіді мають бути інформативними, але структурованими.
2. НІКОЛИ НЕ ЗМІНЮЙ КОД БЕЗ ДОЗВОЛУ. Ти лише пропонуєш код, користувач сам вирішує, чи застосовувати його.
3. НІКОЛИ не вибачайся. Якщо ти зробив помилку, просто напиши "Моя помилка - зараз виправлю..." і відразу надай виправлений варіант.

УМОВНІ ПОЗНАЧЕННЯ ВІД КОРИСТУВАЧА (МАКРОСИ):
Якщо користувач використовує ці символи у своєму повідомленні, виконуй відповідні дії:
"@@@" - замінюй не весь код, а тільки ту частину коду, яку потрібно змінити (ОБОВ'ЯЗКОВО використовуй блок [REPLACE: шлях]).
"%%%" - перевір виконані зміни, чи застосувався код, чи все вірно в файлі, який ми змінили, та чи немає дублюючого коду та помилок.
"(0_0)" - перествори свій запит таким чином щоб це відповідало завданню, а помилки при застосуванню коду були виправлені.

ФОРМАТУВАННЯ КОДУ ТА ЗМІН (КРИТИЧНО ВАЖЛИВО):
Щоб створити новий файл або повністю перезаписати існуючий, використовуй ТІЛЬКИ такий формат (спеціальний тег [FILE: шлях], а одразу під ним блок коду). НАВІТЬ ЯКЩО ФАЙЛ ПУСТИЙ, блок коду є ОБОВ'ЯЗКОВИМ:

[FILE: шлях/до/файлу.ext]
\`\`\`мова
повний код файлу... (або порожньо, якщо файл має бути пустим)
\`\`\`
БЕЗ ЖОДНИХ СЛІВ між тегом [FILE: ...] та блоком коду \`\`\`!

Щоб змінити лише частину існуючого файлу (точкові зміни), використовуйте такий формат:
[REPLACE: шлях/до/файлу.ext]
\`\`\`text
<<<<
точний старий код, який потрібно замінити (має збігатися символ в символ)
====
новий код, яким потрібно замінити
>>>>
\`\`\`

Щоб зберегти прикріплений користувачем файл (наприклад, зображення) у структуру проекту, використовуй команду:
[SAVE_ATTACHMENT: назва_прикріпленого_файлу.ext -> шлях/куди/зберегти/назва.ext]
ТИ МОЖЕШ ЗБЕРІГАТИ ЗОБРАЖЕННЯ ТА ІНШІ ФАЙЛИ, використовуючи цю команду! Не кажи, що не можеш.

КРИТИЧНО ВАЖЛИВО: НІКОЛИ не використовуйте коментарі типу "// решта коду залишається без змін" або "// ...". ВИ ПОВИННІ ПИСАТИ ПОВНИЙ, АБСОЛЮТНО ВЕСЬ КОД ФАЙЛУ ВІД ПОЧАТКУ ДО КІНЦЯ у блоці коду (або використовувати REPLACE блок).
КРИТИЧНО ВАЖЛИВО: При оновленні коду переконайся, що ти не видаляєш існуючі функціональні елементи, імпорти чи стилі, якщо про це прямо не просив користувач. Завжди зберігай цілісність програми.
НІКОЛИ не використовуйте JSON блоки, \`file-op\` або інші формати для коду. Пишіть ПОВНИЙ код у звичайних markdown блоках \`\`\` після тегу [FILE: ...] або [REPLACE: ...].
НІКОЛИ не згадуйте про 'file-op', JSON-блоки або інші внутрішні механізми. Якщо ви надаєте код для збереження, просто скажіть користувачу: "Натисніть кнопку 'Застосувати всі зміни в коді' під цим повідомленням, щоб зберегти файли."

ІНШІ КОМАНДИ (використовуй тільки якщо користувач прямо попросив):
[RENAME: старий_шлях.ext -> новий_шлях.ext]
[DELETE: шлях/до/файлу.ext]
[CREATE_FOLDER: шлях/до/папки]

ОБОВ'ЯЗКОВО використовуйте емодзі у тексті!
ОБОВ'ЯЗКОВО використовуйте форматування: **жирний**, *курсив*, <u>підкреслений</u> (через HTML тег <u>).
НІКОЛИ не згадуйте про папку .temp або session.json. Ігноруйте їх існування.

УВАГА ЩОДО КОНТЕКСТУ:
Ви завжди бачите структуру проекту. Але ви бачите ВМІСТ файлів ТІЛЬКИ якщо користувач увімкнув контекст і виділив їх.

УВАГА ЩОДО ЗОБРАЖЕНЬ:
Якщо користувач просить згенерувати зображення, ОБОВ'ЯЗКОВО використовуйте інструмент \`generate_image\`.`;

    if (settings?.aiModeStepByStep) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "По-кроково". Виконуй лише ОДНУ дію (зміну одного файлу або одну логічну операцію) за одне повідомлення. Не пиши багато коду одразу.`;
    }
    if (settings?.aiModeLineReplace !== false) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "Конкретна заміна рядків". МАКСИМАЛЬНО шукай шляхи як замінити, редагувати або видалити ТІЛЬКИ потрібні рядки в коді за допомогою блоку [REPLACE: шлях], замість того щоб переписувати весь код файлу. Обов'язково проаналізуй поточний стан файлу перед внесенням змін, щоб блок REPLACE точно збігався з існуючим кодом.`;
    } else {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: Повне перезаписування. Для редагування файлів завжди виводь повний код файлу через блок [FILE: шлях].`;
    }

    if (editHistory && editHistory !== '[]') {
      systemInstruction += `\n\nІСТОРІЯ ОСТАННІХ ЗМІН (для уникнення дублювання):\nОсь останні правки, які ти вже вніс. Не повторюй їх:\n${editHistory}\n`;
    }
    
    if (projectStructure) {
      systemInstruction += `\n\nОсь поточна структура файлів та папок проекту:\n${projectStructure}\n`;
    }

    const currentParts: any[] = [];

    if (contextFiles.length > 0) {
      systemInstruction += '\n\nОсь поточний контекст проекту (вміст файлів):\n';
      contextFiles.forEach(f => {
        if (f.isImage) {
          const base64 = f.content.split(',')[1];
          const rawMime = f.content.split(';')[0].split(':')[1];
          const mimeType = getSupportedMimeType(rawMime);
          
          if (mimeType && base64) {
            currentParts.push({
              inlineData: { data: base64, mimeType }
            });
            systemInstruction += `\n--- Файл: ${f.name} (Медіафайл додано до запиту) ---\n`;
          } else {
            systemInstruction += `\n--- Файл: ${f.name} (Формат ${rawMime} не підтримується ШІ) ---\n`;
          }
        } else {
          systemInstruction += `\n--- Файл: ${f.name} ---\n${f.content}\n`;
        }
      });
    }

    const contents = messages.map(msg => {
      const parts: any[] = [];
      let text = msg.text || ' ';
      
      if (msg.role === 'model' && msg.applied) {
        text += '\n\n[SYSTEM: Користувач успішно застосував ці зміни до проекту.]';
      }
      
      if (text.trim() !== '') {
        parts.push({ text });
      } else {
        parts.push({ text: ' ' });
      }
      
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          if (att.data) {
            const base64 = att.data.split(',')[1];
            const mimeType = getSupportedMimeType(att.mimeType);
            if (mimeType && base64) {
              parts.push({ inlineData: { data: base64, mimeType } });
            }
          }
        });
      }
      return { role: msg.role, parts };
    });

    let attachmentsText = '';
    
    if (attachments.length > 0) {
      attachments.forEach(att => {
        if (att.text) {
          attachmentsText += `\n--- Прикріплений файл: ${att.name} ---\n${att.text}\n`;
        } else if (att.data) {
          const base64 = att.data.split(',')[1];
          const mimeType = getSupportedMimeType(att.mimeType);
          if (mimeType && base64) {
            currentParts.push({
              inlineData: { data: base64, mimeType }
            });
          } else {
            attachmentsText += `\n--- Прикріплений файл: ${att.name} (Формат ${att.mimeType} не підтримується ШІ) ---\n`;
          }
        }
      });
    }
    
    const finalPrompt = attachmentsText ? `${newPrompt}\n\n${attachmentsText}` : newPrompt;
    currentParts.push({ text: finalPrompt && finalPrompt.trim() !== '' ? finalPrompt : ' ' });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 8192,
        tools: [{
          functionDeclarations: [{
            name: 'generate_image',
            description: 'Generates an image based on a detailed text prompt. Use this when the user asks to draw, create, or generate an image or picture.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING, description: 'Detailed prompt for the image generation in English.' }
              },
              required: ['prompt']
            }
          }]
        }]
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        const call = chunk.functionCalls[0];
        if (call.name === 'generate_image') {
          const prompt = call.args.prompt as string;
          yield `\n\n⏳ *Генерую зображення за запитом: "${prompt}"*...\n\n`;
          try {
            const imgRes = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: prompt,
              config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
            });
            const base64 = imgRes.generatedImages[0].image.imageBytes;
            yield `![Згенероване зображення](data:image/jpeg;base64,${base64})\n`;
          } catch (e: any) {
            yield `\n❌ *Помилка генерації зображення: ${e.message}*\n`;
          }
          return; 
        }
      }
      if (chunk.text) {
        if (!chunk.text.startsWith('QB`[{') && !chunk.text.includes('"thoughtSignature"')) {
           yield chunk.text;
        }
      }
    }

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    let errMsg = error.message || 'Помилка з\'єднання з ШІ.';
    if (typeof errMsg === 'string' && (errMsg.includes('"candidates"') || errMsg.includes('thoughtSignature') || errMsg.includes('QB`'))) {
      return;
    }
    throw new Error(errMsg);
  }
};

import { Injectable } from '@nestjs/common';
import { AiServiceInterface } from 'src/domain/services/huggingface.service';
import { generateRecipeDto } from 'src/application/dtos/generate-recipe.dto';
import { Language } from 'src/domain/common/language.common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubAiService implements AiServiceInterface {
  private readonly model: string;
  private readonly endpoint: string;
  private readonly token: string;
  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.getOrThrow<string>('ENDPOINT');
    this.token = this.configService.getOrThrow<string>('TOKEN');
    this.model = this.configService.getOrThrow<string>('MODEL');
    if (!this.endpoint || !this.token || !this.model) {
      throw new Error('Parâmetros de IA não configurados corretamente');
    }
  }

  async chat(userMessage: generateRecipeDto, lang: Language): Promise<string> {
    const response = await fetch(
      `${this.endpoint}${this.model}:generateContent?key=${this.token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `Você é um assistente útil para buscar receitas. Escreva as respostas no idioma ${lang}.`,
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Quero que você busque uma receita baseada no nome que eu fornecer. Retorne exclusivamente um JSON no seguinte formato:

{
  "name": "string",
  "ingredients": "string",
  "instructions": "string"
}

O campo ingredients deve conter a lista de ingredientes em texto corrido ou lista; o campo instructions deve conter o passo a passo completo.

Não adicione comentários, explicações, texto fora do JSON ou campos extras. Apenas o JSON final.

A receita a ser buscada é: ${userMessage.title}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1,
            topP: 1,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();

      throw new Error(
        `AI request failed with status ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    const result = await response.json();

    const content = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('');

    if (!content) {
      throw new Error('AI response did not contain a completion message');
    }

    return content;
  }
}

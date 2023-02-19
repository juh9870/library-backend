import { Injectable } from '@nestjs/common';
import parse from 'parse-duration';
import { z } from 'zod';

// eslint-disable-next-line
export declare interface ConfigService extends Config {}

@Injectable()
// eslint-disable-next-line
export class ConfigService {
  constructor() {
    const parsed = configSchema.safeParse(process.env);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      throw new Error(
        'Configuration errors:\n' +
          Object.keys(flat)
            .map((e) => {
              const errors = flat[e];
              if (!errors) return '';
              return '\t' + e + ': ' + errors.join(', ');
            })
            .filter((e) => e.length > 0)
            .join('\n'),
      );
    }
    const cfg = parsed.data;
    for (const key of Object.keys(cfg)) {
      (this as Record<string, unknown>)[key as keyof Config] =
        cfg[key as keyof Config];
    }
  }
}

export const configSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default('3000'),
  COOKIE_MAX_AGE: z.string().transform((s) => parse(s)),
  SESSION_CHECK_PERIOD: z.string().transform((s) => parse(s)),
  SESSION_SECRET: z.string().min(64),
  SALT_ROUNDS: z.string().regex(/^\d+$/).transform(Number),
});

export type Config = z.infer<typeof configSchema>;

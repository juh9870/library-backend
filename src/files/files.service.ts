import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import fg from 'fast-glob';
import { createReadStream, createWriteStream, WriteStream } from 'fs';
import { access, ensureDir, rename, unlink, writeFile } from 'fs-extra';
import { lookup } from 'mime-types';
import path from 'path';
import { slugify } from 'transliteration';
import { z } from 'zod';

import { ConfigService } from '../config/config.service';

export const FileTypeSchema = z.enum(['cover', 'book']);

export type FileType = z.infer<typeof FileTypeSchema>;
export const FileType = FileTypeSchema.Enum;

@Injectable()
export class FilesService {
  constructor(private configService: ConfigService) {}

  public async setFile(
    id: string,
    key: FileType,
    file: Express.Multer.File,
  ): Promise<string> {
    const toDelete = await fg([
      path.join(this.configService.FILE_PATH, `${id}.${key}.*`),
    ]);
    await Promise.all(toDelete.map((p) => unlink(p)));

    const fileName = `${slugify(
      path.basename(file.originalname),
    )}.${id}.${key}${path.extname(file.originalname)}`;
    const newPath = path.join(this.configService.FILE_PATH, fileName);
    await ensureDir(path.dirname(newPath));
    if (file.path) await rename(file.path, newPath);
    else {
      await writeFile(newPath, file.buffer);
    }
    return fileName;
  }

  public async createWriteStream(
    id: string,
    key: FileType,
    originalname: string,
  ): Promise<readonly [WriteStream, string]> {
    const toDelete = await fg([
      path.join(this.configService.FILE_PATH, `${id}.${key}.*`),
    ]);
    await Promise.all(toDelete.map((p) => unlink(p)));

    const fileName = `${id}.${key}${path.extname(originalname)}`;
    const newPath = path.join(this.configService.FILE_PATH, fileName);
    await ensureDir(path.dirname(newPath));
    return [createWriteStream(newPath), fileName] as const;
  }

  public async deleteAll(id: string): Promise<void> {
    const toDelete = await fg([
      path.join(this.configService.FILE_PATH, id + '.*'),
    ]);
    await Promise.all(toDelete.map((p) => unlink(p)));
  }

  public async getFile(
    filename: string | null,
    res: Response,
    dispositionFileName: string | null,
  ): Promise<StreamableFile> {
    res.setHeader(
      'Content-Type',
      (filename && (lookup(filename) || 'application/octet-stream')) ??
        'image/png',
    );
    if (dispositionFileName && filename) {
      const disposition = slugify(dispositionFileName) + path.extname(filename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${disposition}"`,
      );
    }
    try {
      const filePath =
        (filename && path.join(this.configService.FILE_PATH, filename)) ??
        './cover.png';
      await access(filePath);
      const file = createReadStream(filePath);
      return new StreamableFile(file);
    } catch (e) {
      throw new NotFoundException();
    }
  }
}

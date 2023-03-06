import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import fg from 'fast-glob';
import { createReadStream } from 'fs';
import { access, ensureDir, rename, unlink, writeFile } from 'fs-extra';
import { lookup } from 'mime-types';
import path from 'path';
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
      path.join(this.configService.FILE_PATH, id, key + '.*'),
    ]);
    await Promise.all(toDelete.map((p) => unlink(p)));

    const fileName = key + path.extname(file.originalname);
    const newPath = path.join(this.configService.FILE_PATH, id, fileName);
    await ensureDir(path.dirname(newPath));
    if (file.path) await rename(file.path, newPath);
    else {
      await writeFile(newPath, file.buffer);
    }
    return fileName;
  }

  public async deleteAll(id: string): Promise<void> {
    const toDelete = await fg([
      path.join(this.configService.FILE_PATH, id, '*'),
    ]);
    await Promise.all(toDelete.map((p) => unlink(p)));
  }

  public async getFile(
    id: string,
    filename: string,
    res: Response,
    dispositionFileName: string | null,
  ): Promise<StreamableFile> {
    res.setHeader(
      'Content-Type',
      lookup(filename) || 'application/octet-stream',
    );
    if (dispositionFileName) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${
          dispositionFileName + path.extname(filename)
        }"`,
      );
    }
    try {
      const filePath = path.join(this.configService.FILE_PATH, id, filename);
      await access(filePath);
      const file = createReadStream(filePath);
      return new StreamableFile(file);
    } catch (e) {
      throw new NotFoundException();
    }
  }
}

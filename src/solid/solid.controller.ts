import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SolidService } from './solid.service';
import { join } from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

@Controller('solid')
export class SolidController {
  constructor(private readonly solidService: SolidService) { }

  // Login en POD
  @Post('login')
  async login() {
    this.solidService.loginWithToken;
    return { message: 'Logged in to Solid POD' };
  }

  // Subida de archivo (drag & drop)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const tmpDir = process.env.UPLOAD_TMP_DIR || './uploads';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const tmpPath = join(tmpDir, file.originalname);
    fs.writeFileSync(tmpPath, file.buffer); // guardar temporalmente

    const fileUrl = await this.solidService.uploadFile(tmpPath, file.originalname); // subir al POD
    fs.unlinkSync(tmpPath); // borrar archivo temporal

    return { fileUrl }; // devolver URL pública
  }
}

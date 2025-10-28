import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SolidService } from './solid.service';
import { PodType } from './enums/pod-type.enum';
import { UploadFileResponseDto } from './dto/upload-file.dto';
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
    await this.solidService.loginWithToken();
    return { message: 'Logged in to Solid POD' };
  }

  /**
   * Subida de archivo con tipo de POD especificado
   * 
   * @body podType - 'free' | 'community' | 'private'
   * @body stakeholderWebIds - Array de WebIDs (solo para tipo 'private')
   * @file file - Archivo a subir
   * 
   * Ejemplos de uso:
   * 
   * FREE (público):
   * - Form data: file=<archivo>, podType=free
   * 
   * COMMUNITY (compartido):
   * - Form data: file=<archivo>, podType=community
   * 
   * PRIVATE (stakeholders):
   * - Form data: file=<archivo>, podType=private, stakeholderWebIds=["https://user1.solidcommunity.net/profile/card#me", "https://user2.solidcommunity.net/profile/card#me"]
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('podType') podType?: string,
    @Body('stakeholderWebIds') stakeholderWebIds?: string | string[],
  ): Promise<UploadFileResponseDto> {
    // Validar que se subió un archivo
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validar y convertir podType
    const selectedPodType = this.validatePodType(podType);

    // Validar stakeholders para tipo PRIVATE
    let parsedStakeholders: string[] | undefined;
    if (selectedPodType === PodType.PRIVATE && stakeholderWebIds) {
      parsedStakeholders = this.parseStakeholderWebIds(stakeholderWebIds);
    }

    // Guardar archivo temporalmente
    const tmpDir = process.env.UPLOAD_TMP_DIR || './uploads';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const tmpPath = join(tmpDir, file.originalname);
    fs.writeFileSync(tmpPath, file.buffer);

    try {
      // Subir al POD con permisos correspondientes
      const fileUrl = await this.solidService.uploadFile(
        tmpPath,
        file.originalname,
        selectedPodType,
        parsedStakeholders
      );

      // Borrar archivo temporal
      fs.unlinkSync(tmpPath);

      // Preparar respuesta
      const response: UploadFileResponseDto = {
        fileUrl,
        podType: selectedPodType,
        accessLevel: this.getAccessLevelDescription(selectedPodType),
      };

      if (parsedStakeholders && parsedStakeholders.length > 0) {
        response.sharedWith = parsedStakeholders;
      }

      return response;
    } catch (error) {
      // Limpiar archivo temporal en caso de error
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
      throw error;
    }
  }

  /**
   * Endpoint legacy para compatibilidad (por defecto usa FREE)
   */
  @Post('upload-legacy')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileLegacy(@UploadedFile() file: Express.Multer.File) {
    return this.uploadFile(file, PodType.FREE);
  }

  /**
   * Valida el tipo de POD recibido
   */
  private validatePodType(podType?: string): PodType {
    if (!podType) {
      return PodType.FREE; // Por defecto FREE
    }

    const normalizedType = podType.toLowerCase();
    if (!Object.values(PodType).includes(normalizedType as PodType)) {
      throw new BadRequestException(
        `Invalid podType. Must be one of: ${Object.values(PodType).join(', ')}`
      );
    }

    return normalizedType as PodType;
  }

  /**
   * Parsea los WebIDs de stakeholders
   */
  private parseStakeholderWebIds(stakeholderWebIds: string | string[]): string[] {
    let webIds: string[];

    if (typeof stakeholderWebIds === 'string') {
      try {
        // Intentar parsear como JSON
        webIds = JSON.parse(stakeholderWebIds);
      } catch {
        // Si no es JSON, dividir por comas
        webIds = stakeholderWebIds.split(',').map(id => id.trim());
      }
    } else {
      webIds = stakeholderWebIds;
    }

    // Validar formato de WebIDs
    const validWebIds = webIds.filter(webId => {
      try {
        new URL(webId);
        return true;
      } catch {
        console.warn(`Invalid WebID format: ${webId}`);
        return false;
      }
    });

    if (validWebIds.length === 0) {
      throw new BadRequestException('No valid WebIDs provided for private access');
    }

    return validWebIds;
  }

  /**
   * Obtiene descripción del nivel de acceso
   */
  private getAccessLevelDescription(podType: PodType): string {
    const descriptions = {
      [PodType.FREE]: 'Public - Accessible by anyone (URI/URL indexable)',
      [PodType.COMMUNITY]: 'Community - Shared with all registered users',
      [PodType.PRIVATE]: 'Private - Shared only with specific stakeholders',
    };

    return descriptions[podType];
  }
}

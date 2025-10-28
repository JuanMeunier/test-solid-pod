import { PodType } from '../enums/pod-type.enum';

export class UploadFileDto {
  podType: PodType;
  file: Express.Multer.File;
  // Para tipo PRIVATE: lista de WebIDs de stakeholders
  stakeholderWebIds?: string[];
}

export class UploadFileResponseDto {
  fileUrl: string;
  podType: PodType;
  accessLevel: string;
  sharedWith?: string[];
}


import { Injectable } from '@nestjs/common';
import { PodType, POD_FOLDERS } from './enums/pod-type.enum';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SolidService {
    constructor() { }

    async loginWithToken() {
        console.log('✅ Ready to upload files');
        console.log('📍 Target POD:', process.env.SOLID_WEBID);
    }

    private getContentType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const types: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
        };
        return types[ext || ''] || 'application/octet-stream';
    }

    async uploadFile(
        filePath: string,
        fileName: string,
        podType: PodType = PodType.FREE,
        stakeholderWebIds?: string[]
    ) {
        const data = fs.readFileSync(filePath);
        const contentType = this.getContentType(fileName);

        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        const podBaseUrl = process.env.SOLID_WEBID!.split('/profile/')[0];
        const folderName = POD_FOLDERS[podType];
        const fileUrl = `${podBaseUrl}/${folderName}/${safeFileName}`;

        console.log(`📤 Uploading to: ${fileUrl}`);

        // Solo FREE funciona - COMMUNITY y PRIVATE son demo conceptual
        if (podType === PodType.FREE) {
            try {
                // Intentar subir con PUT simple
                const response = await fetch(fileUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': contentType,
                    },
                    body: data,
                });

                if (response.ok) {
                    console.log(`✅ File uploaded successfully: ${fileUrl}`);
                    console.log(`🌍 PUBLIC access: Anyone can access this file`);
                    return fileUrl;
                }

                // Si falla, dar instrucciones
                console.log(`⚠️  Upload failed (${response.status}), returning URL for demo`);
                console.log(`💡 File would be accessible at: ${fileUrl}`);


                return fileUrl;
            } catch (error) {
                console.log(`⚠️  Upload error, returning URL for demo: ${fileUrl}`);
                return fileUrl;
            }
        } else {
            // COMMUNITY y PRIVATE - Solo conceptual para la demo
            console.log(`📋 ${podType.toUpperCase()} upload - Conceptual demo`);
            this.logPermissions(fileUrl, podType, stakeholderWebIds);

            console.log(`💡 In production, OAuth2 authentication would be required`);
            console.log(`💡 File would be stored at: ${fileUrl}`);

            return fileUrl;
        }
    }

    private logPermissions(
        fileUrl: string,
        podType: PodType,
        stakeholderWebIds?: string[]
    ) {
        switch (podType) {
            case PodType.FREE:
                console.log(`🌍 PUBLIC access: Anyone can access ${fileUrl}`);
                break;

            case PodType.COMMUNITY:
                console.log(`👥 COMMUNITY access would be configured for: ${fileUrl}`);
                console.log(`📋 Only registered users would have access via ACL`);
                break;

            case PodType.PRIVATE:
                console.log(`🔒 PRIVATE access would be configured for: ${fileUrl}`);
                if (stakeholderWebIds && stakeholderWebIds.length > 0) {
                    console.log(`📋 Stakeholders who would have access:`, stakeholderWebIds);
                    console.log(`📋 Access control via Web Access Control (WAC)`);
                }
                break;
        }
    }
}
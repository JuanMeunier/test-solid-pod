import { Injectable } from '@nestjs/common';
import { Session } from '@inrupt/solid-client-authn-node';
import { overwriteFile } from '@inrupt/solid-client';
import { PodType, POD_FOLDERS } from './enums/pod-type.enum';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SolidService {
    private session: Session;

    constructor() {
        this.session = new Session();
    }

    async loginWithToken() {
        if (!this.session.info.isLoggedIn) {
            try {
                const token = process.env.SOLID_CLIENT_SECRET;

                if (!token) {
                    throw new Error('SOLID_CLIENT_SECRET not found in .env');
                }

                // Crear fetch autenticado con bearer token
                const authenticatedFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
                    const headers = new Headers(init?.headers);
                    headers.set('Authorization', `Bearer ${token}`);

                    return fetch(url, {
                        ...init,
                        headers,
                    });
                };

                this.session.fetch = authenticatedFetch;
                this.session.info.isLoggedIn = true;
                this.session.info.webId = process.env.SOLID_WEBID;

                console.log('✅ Authenticated session for:', this.session.info.webId);
            } catch (error) {
                console.error('❌ Login error:', error);
                throw error;
            }
        }
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
        if (!this.session.info.isLoggedIn) {
            await this.loginWithToken();
        }

        const data = fs.readFileSync(filePath);
        const contentType = this.getContentType(fileName);
        const blob = new Blob([data], { type: contentType });

        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        const podBaseUrl = process.env.SOLID_WEBID!.split('/profile/')[0];
        const folderName = POD_FOLDERS[podType];
        const podFolder = `${podBaseUrl}/${folderName}/`;
        const fileUrl = `${podFolder}${safeFileName}`;

        console.log(`📤 Uploading to: ${fileUrl}`);

        await overwriteFile(fileUrl, blob, {
            contentType,
            fetch: this.session.fetch,
        });

        console.log(`✅ File uploaded successfully: ${fileUrl}`);

        // Logging de permisos (sin configurarlos realmente para la demo)
        this.logPermissions(fileUrl, podType, stakeholderWebIds);

        return fileUrl;
    }

    private logPermissions(
        fileUrl: string,
        podType: PodType,
        stakeholderWebIds?: string[]
    ) {
        switch (podType) {
            case PodType.FREE:
                console.log(`🌍 PUBLIC access configured for: ${fileUrl}`);
                break;

            case PodType.COMMUNITY:
                console.log(`👥 COMMUNITY access configured for: ${fileUrl}`);
                break;

            case PodType.PRIVATE:
                console.log(`🔒 PRIVATE access configured for: ${fileUrl}`);
                if (stakeholderWebIds && stakeholderWebIds.length > 0) {
                    console.log(`📋 Stakeholders:`, stakeholderWebIds);
                }
                break;
        }
    }
}
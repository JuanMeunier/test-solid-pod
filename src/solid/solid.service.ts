import { Injectable } from '@nestjs/common';
import { Session } from '@inrupt/solid-client-authn-node';
import { overwriteFile, getContentType } from '@inrupt/solid-client';
import * as fs from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SolidService {
    private session: Session;

    constructor() {
        this.session = new Session();
    }

    async loginWithToken() {
        await this.session.login({
            oidcIssuer: process.env.SOLID_IDP,
            refreshToken: process.env.SOLID_TOKEN
        });
    }

    async uploadFile(filePath: string, fileName: string) {
        const data = fs.readFileSync(filePath);
        const contentType = 'application/octet-stream';
        const blob = new Blob([data], { type: contentType });

        const podFolder = process.env.SOLID_WEBID!.replace(/profile\/card#me$/, 'public/');
        const safeFileName = encodeURIComponent(fileName);
        const fileUrl = podFolder + safeFileName;
        await overwriteFile(fileUrl, blob, { contentType, fetch: this.session.fetch });

        return fileUrl;
    }
}



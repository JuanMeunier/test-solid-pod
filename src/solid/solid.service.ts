import { Injectable } from '@nestjs/common';
import { Session } from '@inrupt/solid-client-authn-node';
import {
    overwriteFile,
    getSolidDataset,
    setAgentResourceAccess,
    saveAclFor,
    createAcl,
    setPublicResourceAccess,
} from '@inrupt/solid-client';
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
            await this.session.login({
                oidcIssuer: process.env.SOLID_IDP!,
                clientId: process.env.SOLID_CLIENT_ID!,
                clientSecret: process.env.SOLID_CLIENT_SECRET!,
            });
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

    /**
     * Sube un archivo al POD según el tipo de acceso especificado
     * @param filePath - Ruta local del archivo
     * @param fileName - Nombre del archivo
     * @param podType - Tipo de POD (FREE, COMMUNITY, PRIVATE)
     * @param stakeholderWebIds - WebIDs para acceso PRIVATE (opcional)
     */
    async uploadFile(
        filePath: string,
        fileName: string,
        podType: PodType = PodType.FREE,
        stakeholderWebIds?: string[]
    ) {
        // Verificar sesión
        if (!this.session.info.isLoggedIn) {
            await this.loginWithToken();
        }

        const data = fs.readFileSync(filePath);
        const contentType = this.getContentType(fileName);
        const blob = new Blob([data], { type: contentType });

        // Sanitizar nombre de archivo
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Construir URL según el tipo de POD
        const podBaseUrl = process.env.SOLID_WEBID!.split('/profile/')[0];
        const folderName = POD_FOLDERS[podType];
        const podFolder = `${podBaseUrl}/${folderName}/`;
        const fileUrl = `${podFolder}${safeFileName}`;

        // Subir archivo
        await overwriteFile(fileUrl, blob, {
            contentType,
            fetch: this.session.fetch
        });

        // Configurar permisos según el tipo
        await this.setFilePermissions(fileUrl, podType, stakeholderWebIds);

        return fileUrl;
    }

    /**
     * Configura permisos Web Access Control (WAC) según el tipo de POD
     */
    private async setFilePermissions(
        fileUrl: string,
        podType: PodType,
        stakeholderWebIds?: string[]
    ) {
        try {
            switch (podType) {
                case PodType.FREE:
                    // Acceso público total - Lectura para todos
                    await this.setPublicAccess(fileUrl);
                    break;

                case PodType.COMMUNITY:
                    // Acceso para usuarios autenticados
                    // En Solid, esto se puede implementar compartiendo con grupos específicos
                    // o mediante una lista de usuarios de la comunidad
                    await this.setCommunityAccess(fileUrl);
                    break;

                case PodType.PRIVATE:
                    // Acceso solo para stakeholders específicos
                    if (stakeholderWebIds && stakeholderWebIds.length > 0) {
                        await this.setPrivateAccess(fileUrl, stakeholderWebIds);
                    } else {
                        // Si no hay stakeholders, solo el propietario tiene acceso
                        await this.setOwnerOnlyAccess(fileUrl);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error setting permissions for ${podType}:`, error);
            throw error;
        }
    }

    /**
     * FREE: Acceso público de lectura
     */
    private async setPublicAccess(fileUrl: string) {
        try {
            let resourceAcl = await getSolidDataset(fileUrl, {
                fetch: this.session.fetch,
            });

            // Dar acceso de lectura público
            resourceAcl = setPublicResourceAccess(resourceAcl, {
                read: true,
                write: false,
                append: false,
                control: false,
            });

            // El propietario mantiene control total
            const ownerWebId = this.session.info.webId!;
            resourceAcl = setAgentResourceAccess(resourceAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            await saveAclFor(resourceAcl, fileUrl, { fetch: this.session.fetch });
        } catch (error) {
            console.log('Creating new ACL for public access');
            // Si no existe ACL, crear uno nuevo
            let newAcl = createAcl();
            newAcl = setPublicResourceAccess(newAcl, {
                read: true,
                write: false,
                append: false,
                control: false,
            });

            const ownerWebId = this.session.info.webId!;
            newAcl = setAgentResourceAccess(newAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            await saveAclFor(newAcl, fileUrl, { fetch: this.session.fetch });
        }
    }

    /**
     * COMMUNITY: Acceso compartido con usuarios de la comunidad
     * Nota: Implementación básica - se puede extender con grupos
     */
    private async setCommunityAccess(fileUrl: string) {
        try {
            let resourceAcl = await getSolidDataset(fileUrl, {
                fetch: this.session.fetch,
            });

            // Dar acceso de lectura a usuarios autenticados
            // En una implementación real, aquí agregarías WebIDs específicos de tu comunidad
            resourceAcl = setPublicResourceAccess(resourceAcl, {
                read: false,
                write: false,
                append: false,
                control: false,
            });

            // El propietario mantiene control total
            const ownerWebId = this.session.info.webId!;
            resourceAcl = setAgentResourceAccess(resourceAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            // Aquí puedes agregar WebIDs de usuarios de la comunidad desde una base de datos
            // Ejemplo: const communityUsers = await this.getCommunityUsers();
            // communityUsers.forEach(webId => {
            //     resourceAcl = setAgentResourceAccess(resourceAcl, webId, { read: true });
            // });

            await saveAclFor(resourceAcl, fileUrl, { fetch: this.session.fetch });
        } catch (error) {
            console.log('Creating new ACL for community access');
            let newAcl = createAcl();
            
            const ownerWebId = this.session.info.webId!;
            newAcl = setAgentResourceAccess(newAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            await saveAclFor(newAcl, fileUrl, { fetch: this.session.fetch });
        }
    }

    /**
     * PRIVATE: Acceso solo para stakeholders específicos (network level 1)
     */
    private async setPrivateAccess(fileUrl: string, stakeholderWebIds: string[]) {
        try {
            let resourceAcl = await getSolidDataset(fileUrl, {
                fetch: this.session.fetch,
            });

            // Sin acceso público
            resourceAcl = setPublicResourceAccess(resourceAcl, {
                read: false,
                write: false,
                append: false,
                control: false,
            });

            // El propietario mantiene control total
            const ownerWebId = this.session.info.webId!;
            resourceAcl = setAgentResourceAccess(resourceAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            // Dar acceso de lectura a cada stakeholder
            stakeholderWebIds.forEach(webId => {
                resourceAcl = setAgentResourceAccess(resourceAcl, webId, {
                    read: true,
                    write: false,
                    append: false,
                    control: false,
                });
            });

            await saveAclFor(resourceAcl, fileUrl, { fetch: this.session.fetch });
        } catch (error) {
            console.log('Creating new ACL for private access');
            let newAcl = createAcl();
            
            const ownerWebId = this.session.info.webId!;
            newAcl = setAgentResourceAccess(newAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            stakeholderWebIds.forEach(webId => {
                newAcl = setAgentResourceAccess(newAcl, webId, {
                    read: true,
                    write: false,
                    append: false,
                    control: false,
                });
            });

            await saveAclFor(newAcl, fileUrl, { fetch: this.session.fetch });
        }
    }

    /**
     * Solo el propietario tiene acceso
     */
    private async setOwnerOnlyAccess(fileUrl: string) {
        try {
            let resourceAcl = await getSolidDataset(fileUrl, {
                fetch: this.session.fetch,
            });

            resourceAcl = setPublicResourceAccess(resourceAcl, {
                read: false,
                write: false,
                append: false,
                control: false,
            });

            const ownerWebId = this.session.info.webId!;
            resourceAcl = setAgentResourceAccess(resourceAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            await saveAclFor(resourceAcl, fileUrl, { fetch: this.session.fetch });
        } catch (error) {
            console.log('Creating new ACL for owner-only access');
            let newAcl = createAcl();
            
            const ownerWebId = this.session.info.webId!;
            newAcl = setAgentResourceAccess(newAcl, ownerWebId, {
                read: true,
                write: true,
                append: true,
                control: true,
            });

            await saveAclFor(newAcl, fileUrl, { fetch: this.session.fetch });
        }
    }
}
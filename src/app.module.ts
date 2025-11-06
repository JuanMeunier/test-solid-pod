import { Module } from '@nestjs/common';
import { SolidModule } from './solid/solid.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [SolidModule, UsersModule, AuthModule],
})
export class AppModule { }

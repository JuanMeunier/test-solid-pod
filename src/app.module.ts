import { Module } from '@nestjs/common';
import { SolidModule } from './solid/solid.module';


@Module({
  imports: [SolidModule],
})
export class AppModule { }

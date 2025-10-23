import { Module } from '@nestjs/common';
import { SolidService } from './solid.service';
import { SolidController } from './solid.controller';

@Module({
  controllers: [SolidController],
  providers: [SolidService],
})
export class SolidModule {}

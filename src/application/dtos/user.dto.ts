import { IsDate, IsNumber, IsString } from 'class-validator';
import { RecipeDto } from './recipe.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'the user id', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'the user email',
    example: 'anyName@domain.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'the user name',
    example: 'John Doe',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'the date the user was created',
  })
  @IsDate()
  createdAt?: Date;

  @IsDate()
  updatedAt?: Date;
  recipes?: RecipeDto[];
  constructor(
    id: number,
    username: string,
    email: string,
    createdAt?: Date,
    updatedAt?: Date,
    recipes?: RecipeDto[],
  ) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.recipes = recipes;
  }
}

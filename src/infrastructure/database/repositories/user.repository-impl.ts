import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/domain/interfaces/repository/user.repository';
import { UserORMEntity } from '../typeorm/user.orm-entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from 'src/application/dtos/create-user.dto';
import { UserDto } from 'src/application/dtos/user.dto';
import { UserMapper } from 'src/infrastructure/mappers/user.mapper';
import * as bcrypt from 'bcrypt';
import { i18nValidationMessage } from 'nestjs-i18n';
import { updateUserDto } from 'src/application/dtos/update-user.dto';
import { User } from 'src/domain/interfaces/entities/user.entity';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(UserORMEntity)
    private readonly ormRepo: Repository<UserORMEntity>,
  ) {}
  async create(user: CreateUserDto): Promise<UserDto> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);
    const userWithHashedPassword = { ...user, password: hashedPassword };
    const userOrmEntity = UserMapper.fromcreateDtoToOrm(
      userWithHashedPassword,
      salt,
    );
    const savedUser = await this.ormRepo.save(userOrmEntity);
    return UserMapper.toDto(savedUser); // Sempre converta para DTO antes de retornar
  }
  async getMe(id: number): Promise<UserDto | null> {
    const userDetails = await this.ormRepo.findOne({ where: { id } });
    if (!userDetails) {
      throw new HttpException(
        i18nValidationMessage('validation.userNotFound'),
        404,
      );
    }
    const detailsDto = UserMapper.toDto(userDetails);
    return detailsDto;
  }
  async delete(id: number): Promise<void> {
    const existingUser = await this.ormRepo.findOne({ where: { id } });
    if (!existingUser) {
      throw new HttpException(
        i18nValidationMessage('validation.userNotFound'),
        HttpStatus.NOT_FOUND,
      );
    }
    await this.ormRepo.remove(existingUser);
  }
  async update(user: updateUserDto): Promise<UserDto | null> {
    const existingUser = await this.ormRepo.findOne({ where: { id: user.id } });
    if (!existingUser) {
      throw new HttpException(
        i18nValidationMessage('validation.userNotFound'),
        404,
      );
    }
    existingUser.username = user.name;
    existingUser.email = user.email;
    if (user.password !== undefined) {
      const salt = await bcrypt.genSalt();
      existingUser.password = await bcrypt.hash(user.password, salt);
      existingUser.salt = salt;
    }
    await this.ormRepo.save(existingUser);
    return UserMapper.toDto(existingUser);
  }
  async findByEmailForAuth(email: string): Promise<User | null> {
    const findByEmail = await this.ormRepo.findOneBy({ email });
    if (!findByEmail) {
      throw new HttpException(
        i18nValidationMessage('validation.userNotFound'),
        404,
      );
    }

    return UserMapper.toDomainEntity(findByEmail);
  }
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

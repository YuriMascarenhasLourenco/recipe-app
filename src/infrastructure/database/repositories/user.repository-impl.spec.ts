import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserDto } from '../../../application/dtos/user.dto';
import { updateUserDto } from '../../../application/dtos/update-user.dto';
import { RecipeORMEntity } from '../typeorm/recipe.orm-entity';
import { UserORMEntity } from '../typeorm/user.orm-entity';
import { RecipeMapper } from '../../mappers/recipe.mapper';
import { UserRepositoryImpl } from './user.repository-impl';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('UserRepositoryImpl', () => {
  let ormRepo: Repository<UserORMEntity>;
  let repository: UserRepositoryImpl;

  beforeEach(() => {
    ormRepo = Object.assign(Object.create(Repository.prototype), {
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    }) as Repository<UserORMEntity>;
    repository = new UserRepositoryImpl(ormRepo);
  });

  it('returns a public DTO after registration', async () => {
    (ormRepo.save as jest.Mock).mockImplementation(async (user) =>
      Object.assign(user, { id: 1, createdAt: new Date() }),
    );

    const result = await repository.create({
      username: 'jane',
      email: 'jane@example.com',
      password: 'plain-text-password',
    });

    expect(result).toBeInstanceOf(UserDto);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('salt');
    const savedUser = (ormRepo.save as jest.Mock).mock.calls[0][0];
    expect(savedUser.password).not.toBe('plain-text-password');
    expect(
      await bcrypt.compare('plain-text-password', savedUser.password),
    ).toBe(true);
  });

  it('returns a public DTO for a user profile', async () => {
    (ormRepo.findOne as jest.Mock).mockResolvedValue(
      Object.assign(new UserORMEntity(), {
        id: 2,
        username: 'jane',
        email: 'jane@example.com',
        password: 'stored-hash',
        salt: 'stored-salt',
        createdAt: new Date(),
      }),
    );

    const result = await repository.getMe(2);

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('salt');
  });

  it('omits credentials from the user nested in a recipe DTO', () => {
    const recipe = Object.assign(new RecipeORMEntity(), {
      id: 3,
      title: 'Soup',
      ingredients: 'water',
      instructions: 'Boil',
      createdAt: new Date(),
      user: Object.assign(new UserORMEntity(), {
        id: 2,
        username: 'jane',
        email: 'jane@example.com',
        password: 'stored-hash',
        salt: 'stored-salt',
      }),
    });

    const result = RecipeMapper.toDto(recipe);

    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('salt');
  });

  it('does not document credentials in the public user Swagger schema', () => {
    const schemaProperties = Reflect.getMetadata(
      'swagger/apiModelPropertiesArray',
      UserDto.prototype,
    ) as string[];

    expect(schemaProperties).not.toContain(':password');
    expect(schemaProperties).not.toContain(':salt');
  });

  it('hashes a provided password and preserves it when omitted', async () => {
    const originalHash = await bcrypt.hash('old-password', 4);
    const existingUser = Object.assign(new UserORMEntity(), {
      id: 2,
      username: 'jane',
      email: 'jane@example.com',
      password: originalHash,
      salt: 'original-salt',
      createdAt: new Date(),
    });
    (ormRepo.findOne as jest.Mock).mockResolvedValue(existingUser);
    (ormRepo.save as jest.Mock).mockImplementation(async (user) => user);

    await repository.update({
      id: 2,
      password: 'new-password',
    } as updateUserDto);

    expect(existingUser.password).not.toBe('new-password');
    expect(await bcrypt.compare('new-password', existingUser.password)).toBe(
      true,
    );
    expect(existingUser.salt).not.toBe('original-salt');

    const newHash = existingUser.password;
    const newSalt = existingUser.salt;
    await repository.update({ id: 2 } as updateUserDto);

    expect(existingUser.password).toBe(newHash);
    expect(existingUser.salt).toBe(newSalt);
  });
});

import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { VillagesService } from '../villages/villages.service';
import { RegisterDto, LoginDto, UpdateUsernameDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private villagesService: VillagesService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByUsernameOrEmail(
      registerDto.username,
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      username: registerDto.username,
      email: registerDto.email,
      passwordHash,
    });

    // Create initial village for the user
    const village = await this.villagesService.createInitialVillage(user.id, `${user.username}'s Village`);

    // Generate JWT token with villageId
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      villageId: village.id,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by username or email
    const user = await this.usersService.findByUsernameOrEmail(
      loginDto.identifier,
      loginDto.identifier,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user's village
    const village = await this.villagesService.findByUserId(user.id);

    // Generate JWT token with villageId
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      villageId: village?.id,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    // Check if username is already taken
    const existingUser = await this.usersService.findByUsername(updateUsernameDto.username);

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username already exists');
    }

    // Update username
    const updatedUser = await this.usersService.updateUsername(userId, updateUsernameDto.username);

    return {
      userId: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    };
  }
}

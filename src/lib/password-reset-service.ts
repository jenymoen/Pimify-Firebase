import { userService } from './user-service';
import { userEmailService } from './user-email-service';

interface ResetRecord { userId: string; token: string; expiresAt: number }

class PasswordResetService {
  private tokens: Map<string, ResetRecord> = new Map();
  private emailToToken: Map<string, string> = new Map();
  private ttlMs = 60 * 60 * 1000; // 1 hour

  async requestReset(email: string): Promise<{ success: boolean }>{
    const user = await userService.getByEmail(email);
    if (!user.success || !user.data) {
      // Do not reveal existence
      return { success: true };
    }
    const token = this.generateToken();
    const rec: ResetRecord = { userId: user.data.id, token, expiresAt: Date.now() + this.ttlMs };
    this.tokens.set(token, rec);
    this.emailToToken.set(email.toLowerCase(), token);
    await userEmailService.send(email, 'Password Reset', `<p>Use this token to reset your password: <b>${token}</b></p>`);
    return { success: true };
  }

  verify(token: string): { success: boolean; userId?: string }{
    const rec = this.tokens.get(token);
    if (!rec || rec.expiresAt < Date.now()) return { success: false };
    return { success: true, userId: rec.userId };
  }

  consume(token: string): void {
    const rec = this.tokens.get(token);
    if (!rec) return;
    this.tokens.delete(token);
  }

  private generateToken(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase() + Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}

export const passwordResetService = new PasswordResetService();



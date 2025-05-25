import { EMAIL_LIMITS, ERROR_MESSAGES } from './constants.js';

interface RateLimitConfig {
  dailyLimit: number;
  monthlyLimit: number;
}

interface UsageStats {
  dailyCount: number;
  monthlyCount: number;
  lastResetDate: string;
  lastMonthlyResetDate: string;
}

export class EmailRateLimiter {
  private kv: KVNamespace;
  private userId: string;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, userId: string, isPremium: boolean = false) {
    this.kv = kv;
    this.userId = userId;
    this.config = isPremium ? EMAIL_LIMITS.PREMIUM_TIER : EMAIL_LIMITS.FREE_TIER;
  }

  /**
   * Check if user can send an email based on rate limits
   */
  async canSendEmail(): Promise<{ allowed: boolean; reason?: string; resetTime?: Date }> {
    const stats = await this.getUsageStats();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

    // Reset daily count if it's a new day
    if (stats.lastResetDate !== today) {
      stats.dailyCount = 0;
      stats.lastResetDate = today;
    }

    // Reset monthly count if it's a new month
    if (stats.lastMonthlyResetDate !== currentMonth) {
      stats.monthlyCount = 0;
      stats.lastMonthlyResetDate = currentMonth;
    }

    // Check daily limit
    if (stats.dailyCount >= this.config.dailyLimit) {
      const resetTime = new Date(now);
      resetTime.setDate(resetTime.getDate() + 1);
      resetTime.setHours(0, 0, 0, 0);
      
      return {
        allowed: false,
        reason: `Daily limit of ${this.config.dailyLimit} emails exceeded`,
        resetTime,
      };
    }

    // Check monthly limit
    if (stats.monthlyCount >= this.config.monthlyLimit) {
      const resetTime = new Date(now);
      resetTime.setMonth(resetTime.getMonth() + 1);
      resetTime.setDate(1);
      resetTime.setHours(0, 0, 0, 0);
      
      return {
        allowed: false,
        reason: `Monthly limit of ${this.config.monthlyLimit} emails exceeded`,
        resetTime,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an email send (increment counters)
   */
  async recordEmailSent(): Promise<void> {
    const stats = await this.getUsageStats();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().substring(0, 7);

    // Reset counters if needed
    if (stats.lastResetDate !== today) {
      stats.dailyCount = 0;
      stats.lastResetDate = today;
    }

    if (stats.lastMonthlyResetDate !== currentMonth) {
      stats.monthlyCount = 0;
      stats.lastMonthlyResetDate = currentMonth;
    }

    // Increment counters
    stats.dailyCount++;
    stats.monthlyCount++;

    // Save updated stats
    await this.saveUsageStats(stats);
  }

  /**
   * Get current usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const key = `email_usage:${this.userId}`;
    const stored = await this.kv.get(key, 'json');
    
    if (stored) {
      return stored as UsageStats;
    }

    // Return default stats for new users
    const now = new Date();
    return {
      dailyCount: 0,
      monthlyCount: 0,
      lastResetDate: now.toISOString().split('T')[0],
      lastMonthlyResetDate: now.toISOString().substring(0, 7),
    };
  }

  /**
   * Save usage statistics to KV store
   */
  private async saveUsageStats(stats: UsageStats): Promise<void> {
    const key = `email_usage:${this.userId}`;
    await this.kv.put(key, JSON.stringify(stats), {
      // Expire after 2 months to clean up old data
      expirationTtl: 60 * 60 * 24 * 60, // 60 days
    });
  }

  /**
   * Get remaining email quota
   */
  async getRemainingQuota(): Promise<{
    daily: { remaining: number; limit: number };
    monthly: { remaining: number; limit: number };
  }> {
    const stats = await this.getUsageStats();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().substring(0, 7);

    // Reset counts if needed for accurate remaining calculation
    let dailyCount = stats.dailyCount;
    let monthlyCount = stats.monthlyCount;

    if (stats.lastResetDate !== today) {
      dailyCount = 0;
    }

    if (stats.lastMonthlyResetDate !== currentMonth) {
      monthlyCount = 0;
    }

    return {
      daily: {
        remaining: Math.max(0, this.config.dailyLimit - dailyCount),
        limit: this.config.dailyLimit,
      },
      monthly: {
        remaining: Math.max(0, this.config.monthlyLimit - monthlyCount),
        limit: this.config.monthlyLimit,
      },
    };
  }

  /**
   * Reset usage stats (admin function)
   */
  async resetUsageStats(): Promise<void> {
    const now = new Date();
    const stats: UsageStats = {
      dailyCount: 0,
      monthlyCount: 0,
      lastResetDate: now.toISOString().split('T')[0],
      lastMonthlyResetDate: now.toISOString().substring(0, 7),
    };
    
    await this.saveUsageStats(stats);
  }
} 
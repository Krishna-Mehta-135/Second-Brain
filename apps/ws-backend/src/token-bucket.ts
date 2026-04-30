/**
 * Token Bucket Algorithm
 * Provides burst tolerance while enforcing a long-term rate limit.
 * Pure logic class, decoupled from transport layers.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  /**
   * @param capacity Max burst size (total tokens the bucket can hold)
   * @param refillRate Refill rate in tokens per second
   */
  constructor(
    private readonly capacity: number,
    private readonly refillRate: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume tokens.
   * @param amount Number of tokens to consume (default: 1)
   * @returns true if tokens were available and consumed, false otherwise
   */
  public consume(amount: number = 1): boolean {
    this.refill();

    if (this.tokens < amount) {
      return false;
    }

    this.tokens -= amount;
    return true;
  }

  /**
   * Manually add tokens (e.g. for refunding failed operations).
   */
  public refund(amount: number = 1): void {
    this.tokens = Math.min(this.capacity, this.tokens + amount);
  }

  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    
    // Calculate new tokens based on elapsed time (seconds)
    const newTokens = (elapsedMs / 1000) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

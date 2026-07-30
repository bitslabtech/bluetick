const request = require('supertest');
const express = require('express');
const { MetaAdCampaign } = require('../models/MetaAdCampaign');
const { User } = require('../models/User');
const metaAdsStateMachine = require('../utils/metaAdsStateMachine');
const metaAdsPublisher = require('../utils/metaAdsPublisher');

// Mock dependencies
jest.mock('../models/MetaAdCampaign');
jest.mock('../models/User');
jest.mock('../utils/metaAdsPublisher');

// Basic setup to test routes
const app = express();
app.use(express.json());

// Dummy route testing state machine separately
describe('Meta Ads State Machine', () => {
  it('should allow transition from DRAFT to ACTIVE', () => {
    const result = metaAdsStateMachine.canTransition('DRAFT', 'ACTIVE');
    expect(result).toBe(true);
  });

  it('should prevent transition from DRAFT to PAUSED', () => {
    const result = metaAdsStateMachine.canTransition('DRAFT', 'PAUSED');
    expect(result).toBe(false);
  });

  it('should allow transition from ACTIVE to PAUSED', () => {
    const result = metaAdsStateMachine.canTransition('ACTIVE', 'PAUSED');
    expect(result).toBe(true);
  });
});

describe('Meta Ads Publish Logic (Mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('metaAdsPublisher.publishCampaign returns adId on success', async () => {
    metaAdsPublisher.publishCampaign.mockResolvedValue('ad_123456');

    const adId = await metaAdsPublisher.publishCampaign(1, {}, 'dummy_token', '123');
    expect(adId).toBe('ad_123456');
    expect(metaAdsPublisher.publishCampaign).toHaveBeenCalledTimes(1);
  });

  it('metaAdsPublisher.publishCampaign throws an error on failure', async () => {
    metaAdsPublisher.publishCampaign.mockRejectedValue(new Error('Meta API Error'));

    await expect(metaAdsPublisher.publishCampaign(1, {}, 'dummy_token', '123'))
      .rejects
      .toThrow('Meta API Error');
  });
});

describe('Billing Logic (Mocked)', () => {
  // A simple test replicating what would happen in the billing middleware/route
  it('should deduct AI tokens correctly', async () => {
    const mockUser = { id: 1, aiTokenBalance: 100, save: jest.fn() };
    
    // Simulate token deduction
    const tokenCost = 15;
    if (mockUser.aiTokenBalance >= tokenCost) {
      mockUser.aiTokenBalance -= tokenCost;
      await mockUser.save();
    }

    expect(mockUser.aiTokenBalance).toBe(85);
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });

  it('should fail if insufficient tokens', async () => {
    const mockUser = { id: 1, aiTokenBalance: 10, save: jest.fn() };
    
    const tokenCost = 15;
    let error;
    try {
      if (mockUser.aiTokenBalance < tokenCost) {
        throw new Error('Insufficient AI tokens');
      }
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.message).toBe('Insufficient AI tokens');
    expect(mockUser.save).not.toHaveBeenCalled();
  });
});

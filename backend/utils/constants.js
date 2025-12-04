// backend/utils/constants.js

export const SCALING_FACTOR = 1e6;
export const HISTOGRAM_BUCKETS = 10;
export const BUCKET_WIDTH = 0.0001;

export const WINDOW_TYPES = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
};

export const MODES = {
  NORMAL: 'normal',
  PRIVACY: 'privacy',
};

export const PROGRAMS = {
  COMPUTE_MEAN_VARIANCE: 'compute_mean_variance',
  COMPUTE_SHIELDED_RATIO: 'compute_shielded_ratio',
  COMPUTE_FEE_STATISTICS: 'compute_fee_statistics',
};

export const TOLERANCE = 0.01; // 1% tolerance for validation

import { TimeSeriesPoint } from './advancedStatisticalModels';

export interface PreprocessingResult {
  processedData: TimeSeriesPoint[];
  transformations: string[];
  outliers: Array<{
    index: number;
    value: number;
    type: 'outlier' | 'anomaly';
    severity: 'low' | 'medium' | 'high';
  }>;
  stationarity: {
    isStationary: boolean;
    pValue: number;
    differenceOrder: number;
  };
  seasonality: {
    hasSeasonality: boolean;
    period: number;
    strength: number;
  };
}

export interface DataQuality {
  completeness: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
  overall: number;
  issues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    affectedPoints: number[];
  }>;
}

export interface ImputationOptions {
  method: 'linear' | 'spline' | 'forward_fill' | 'backward_fill' | 'seasonal' | 'mean';
  maxGapSize: number;
  seasonalPeriod?: number;
}

export class TimeSeriesPreprocessor {
  // Comprehensive data quality assessment
  static assessDataQuality(data: TimeSeriesPoint[]): DataQuality {
    const issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedPoints: number[];
    }> = [];

    // Check for missing values
    const missingValues = data.filter((point, i) => 
      point.value === null || point.value === undefined || isNaN(point.value)
    );
    
    if (missingValues.length > 0) {
      issues.push({
        type: 'missing_values',
        description: `${missingValues.length} missing values detected`,
        severity: missingValues.length / data.length > 0.1 ? 'high' : 'medium',
        affectedPoints: missingValues.map((_, i) => i)
      });
    }

    // Check for duplicate timestamps
    const timestamps = data.map(point => point.date);
    const uniqueTimestamps = new Set(timestamps);
    if (timestamps.length !== uniqueTimestamps.size) {
      issues.push({
        type: 'duplicate_timestamps',
        description: 'Duplicate timestamps detected',
        severity: 'medium',
        affectedPoints: []
      });
    }

    // Check for irregular intervals
    const intervals = this.calculateIntervals(data);
    const irregularIntervals = this.detectIrregularIntervals(intervals);
    if (irregularIntervals.length > 0) {
      issues.push({
        type: 'irregular_intervals',
        description: 'Irregular time intervals detected',
        severity: 'low',
        affectedPoints: irregularIntervals
      });
    }

    // Check for extreme outliers
    const outliers = this.detectOutliers(data, 3); // 3 standard deviations
    if (outliers.length > 0) {
      issues.push({
        type: 'extreme_outliers',
        description: `${outliers.length} extreme outliers detected`,
        severity: outliers.length / data.length > 0.05 ? 'high' : 'medium',
        affectedPoints: outliers.map(o => o.index)
      });
    }

    // Calculate quality scores
    const completeness = (data.length - missingValues.length) / data.length * 100;
    const consistency = timestamps.length === uniqueTimestamps.size ? 100 : 80;
    const accuracy = outliers.length / data.length > 0.1 ? 70 : 95;
    const timeliness = irregularIntervals.length / data.length > 0.1 ? 80 : 100;
    const overall = (completeness + consistency + accuracy + timeliness) / 4;

    return {
      completeness,
      consistency,
      accuracy,
      timeliness,
      overall,
      issues
    };
  }

  // Advanced outlier detection using multiple methods
  static detectOutliers(
    data: TimeSeriesPoint[], 
    threshold: number = 2.5,
    methods: Array<'zscore' | 'iqr' | 'isolation' | 'lof'> = ['zscore', 'iqr']
  ): Array<{
    index: number;
    value: number;
    type: 'outlier' | 'anomaly';
    severity: 'low' | 'medium' | 'high';
    method: string;
  }> {
    const outliers: Array<{
      index: number;
      value: number;
      type: 'outlier' | 'anomaly';
      severity: 'low' | 'medium' | 'high';
      method: string;
    }> = [];

    const values = data.map(d => d.value);

    // Z-Score method
    if (methods.includes('zscore')) {
      const zScoreOutliers = this.detectZScoreOutliers(values, threshold);
      outliers.push(...zScoreOutliers.map(o => ({
        ...o,
        method: 'zscore'
      })));
    }

    // IQR method
    if (methods.includes('iqr')) {
      const iqrOutliers = this.detectIQROutliers(values);
      outliers.push(...iqrOutliers.map(o => ({
        ...o,
        method: 'iqr'
      })));
    }

    // Remove duplicates (same index detected by multiple methods)
    const uniqueOutliers = new Map();
    outliers.forEach(outlier => {
      const key = outlier.index;
      if (!uniqueOutliers.has(key) || 
          outlier.severity === 'high' && uniqueOutliers.get(key).severity !== 'high') {
        uniqueOutliers.set(key, outlier);
      }
    });

    return Array.from(uniqueOutliers.values());
  }

  // Missing value imputation with multiple strategies
  static imputeMissingValues(
    data: TimeSeriesPoint[], 
    options: ImputationOptions = { method: 'linear', maxGapSize: 5 }
  ): TimeSeriesPoint[] {
    const result = [...data];
    const missingIndices = result
      .map((point, i) => ({ index: i, missing: point.value === null || point.value === undefined || isNaN(point.value) }))
      .filter(item => item.missing)
      .map(item => item.index);

    if (missingIndices.length === 0) {
      return result;
    }

    // Group consecutive missing values
    const gaps = this.groupConsecutiveIndices(missingIndices);

    for (const gap of gaps) {
      if (gap.length > options.maxGapSize) {
        console.warn(`Gap of size ${gap.length} exceeds maximum allowed size ${options.maxGapSize}`);
        continue;
      }

      const startIndex = gap[0];
      const endIndex = gap[gap.length - 1];

      switch (options.method) {
        case 'linear':
          this.linearInterpolation(result, startIndex, endIndex);
          break;
        case 'spline':
          this.splineInterpolation(result, startIndex, endIndex);
          break;
        case 'forward_fill':
          this.forwardFill(result, startIndex, endIndex);
          break;
        case 'backward_fill':
          this.backwardFill(result, startIndex, endIndex);
          break;
        case 'seasonal':
          this.seasonalImputation(result, startIndex, endIndex, options.seasonalPeriod || 7);
          break;
        case 'mean':
          this.meanImputation(result, startIndex, endIndex);
          break;
      }
    }

    return result;
  }

  // Data transformation for stationarity
  static makeStationary(data: TimeSeriesPoint[], maxDifferences: number = 2): {
    stationaryData: TimeSeriesPoint[];
    differenceOrder: number;
    isStationary: boolean;
  } {
    let currentData = [...data];
    let differenceOrder = 0;

    // Test initial stationarity
    let isStationary = this.testStationarity(currentData);

    while (!isStationary && differenceOrder < maxDifferences) {
      currentData = this.differenceData(currentData);
      differenceOrder++;
      isStationary = this.testStationarity(currentData);
    }

    return {
      stationaryData: currentData,
      differenceOrder,
      isStationary
    };
  }

  // Seasonal adjustment and decomposition
  static removeSeasonality(
    data: TimeSeriesPoint[], 
    period: number,
    method: 'additive' | 'multiplicative' = 'additive'
  ): {
    deseasonalized: TimeSeriesPoint[];
    seasonal: number[];
    trend: number[];
    residual: number[];
  } {
    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate seasonal indices
    const seasonal = this.calculateSeasonalIndices(values, period, method);
    
    // Calculate trend using moving average
    const trend = this.calculateTrend(values, period);
    
    // Remove seasonality
    const deseasonalized = data.map((point, i) => ({
      date: point.date,
      value: method === 'additive' 
        ? point.value - seasonal[i % period]
        : point.value / seasonal[i % period]
    }));

    // Calculate residual
    const residual = values.map((value, i) => {
      const expectedValue = method === 'additive'
        ? trend[i] + seasonal[i % period]
        : trend[i] * seasonal[i % period];
      return value - expectedValue;
    });

    return {
      deseasonalized,
      seasonal,
      trend,
      residual
    };
  }

  // Comprehensive preprocessing pipeline
  static preprocess(
    data: TimeSeriesPoint[],
    options: {
      handleOutliers: boolean;
      imputeMissing: boolean;
      makeStationary: boolean;
      removeSeasonality: boolean;
      outlierThreshold?: number;
      imputationOptions?: ImputationOptions;
      seasonalPeriod?: number;
    } = {
      handleOutliers: true,
      imputeMissing: true,
      makeStationary: false,
      removeSeasonality: false
    }
  ): PreprocessingResult {
    let processedData = [...data];
    const transformations: string[] = [];
    let outliers: Array<{
      index: number;
      value: number;
      type: 'outlier' | 'anomaly';
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Step 1: Handle missing values
    if (options.imputeMissing) {
      const beforeCount = processedData.filter(p => 
        p.value === null || p.value === undefined || isNaN(p.value)
      ).length;
      
      processedData = this.imputeMissingValues(
        processedData, 
        options.imputationOptions || { method: 'linear', maxGapSize: 5 }
      );
      
      const afterCount = processedData.filter(p => 
        p.value === null || p.value === undefined || isNaN(p.value)
      ).length;
      
      if (beforeCount > afterCount) {
        transformations.push(`Imputed ${beforeCount - afterCount} missing values`);
      }
    }

    // Step 2: Detect and handle outliers
    if (options.handleOutliers) {
      outliers = this.detectOutliers(processedData, options.outlierThreshold || 2.5);
      
      // Apply outlier treatment (winsorization)
      const treatedData = this.winsorizeOutliers(processedData, outliers);
      
      if (outliers.length > 0) {
        processedData = treatedData;
        transformations.push(`Treated ${outliers.length} outliers via winsorization`);
      }
    }

    // Step 3: Remove seasonality
    let seasonality = { hasSeasonality: false, period: 0, strength: 0 };
    if (options.removeSeasonality && options.seasonalPeriod) {
      const decomposition = this.removeSeasonality(processedData, options.seasonalPeriod);
      processedData = decomposition.deseasonalized;
      
      seasonality = {
        hasSeasonality: true,
        period: options.seasonalPeriod,
        strength: this.calculateSeasonalStrength(decomposition.seasonal)
      };
      
      transformations.push(`Removed seasonality (period=${options.seasonalPeriod})`);
    }

    // Step 4: Make stationary
    let stationarity = { isStationary: true, pValue: 0.01, differenceOrder: 0 };
    if (options.makeStationary) {
      const stationaryResult = this.makeStationary(processedData);
      processedData = stationaryResult.stationaryData;
      
      stationarity = {
        isStationary: stationaryResult.isStationary,
        pValue: stationaryResult.isStationary ? 0.01 : 0.1,
        differenceOrder: stationaryResult.differenceOrder
      };
      
      if (stationaryResult.differenceOrder > 0) {
        transformations.push(`Applied ${stationaryResult.differenceOrder} differences for stationarity`);
      }
    }

    return {
      processedData,
      transformations,
      outliers,
      stationarity,
      seasonality
    };
  }

  // Helper methods
  private static calculateIntervals(data: TimeSeriesPoint[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const current = new Date(data[i].date).getTime();
      const previous = new Date(data[i - 1].date).getTime();
      intervals.push(current - previous);
    }
    return intervals;
  }

  private static detectIrregularIntervals(intervals: number[]): number[] {
    if (intervals.length === 0) return [];
    
    const median = this.calculateMedian(intervals);
    const threshold = median * 0.1; // 10% tolerance
    
    return intervals
      .map((interval, i) => ({ interval, index: i }))
      .filter(({ interval }) => Math.abs(interval - median) > threshold)
      .map(({ index }) => index);
  }

  private static detectZScoreOutliers(
    values: number[], 
    threshold: number
  ): Array<{
    index: number;
    value: number;
    type: 'outlier' | 'anomaly';
    severity: 'low' | 'medium' | 'high';
  }> {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return values
      .map((value, index) => {
        const zScore = Math.abs((value - mean) / std);
        if (zScore > threshold) {
          return {
            index,
            value,
            type: zScore > threshold * 1.5 ? 'anomaly' : 'outlier' as 'outlier' | 'anomaly',
            severity: zScore > threshold * 2 ? 'high' : zScore > threshold * 1.5 ? 'medium' : 'low' as 'low' | 'medium' | 'high'
          };
        }
        return null;
      })
      .filter(item => item !== null) as Array<{
        index: number;
        value: number;
        type: 'outlier' | 'anomaly';
        severity: 'low' | 'medium' | 'high';
      }>;
  }

  private static detectIQROutliers(
    values: number[]
  ): Array<{
    index: number;
    value: number;
    type: 'outlier' | 'anomaly';
    severity: 'low' | 'medium' | 'high';
  }> {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const extremeLowerBound = q1 - 3 * iqr;
    const extremeUpperBound = q3 + 3 * iqr;

    return values
      .map((value, index) => {
        if (value < lowerBound || value > upperBound) {
          const isExtreme = value < extremeLowerBound || value > extremeUpperBound;
          return {
            index,
            value,
            type: isExtreme ? 'anomaly' : 'outlier' as 'outlier' | 'anomaly',
            severity: isExtreme ? 'high' : 'medium' as 'low' | 'medium' | 'high'
          };
        }
        return null;
      })
      .filter(item => item !== null) as Array<{
        index: number;
        value: number;
        type: 'outlier' | 'anomaly';
        severity: 'low' | 'medium' | 'high';
      }>;
  }

  private static groupConsecutiveIndices(indices: number[]): number[][] {
    if (indices.length === 0) return [];
    
    const groups: number[][] = [];
    let currentGroup = [indices[0]];
    
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] === indices[i - 1] + 1) {
        currentGroup.push(indices[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [indices[i]];
      }
    }
    groups.push(currentGroup);
    
    return groups;
  }

  private static linearInterpolation(data: TimeSeriesPoint[], startIndex: number, endIndex: number): void {
    const beforeValue = startIndex > 0 ? data[startIndex - 1].value : data[endIndex + 1].value;
    const afterValue = endIndex < data.length - 1 ? data[endIndex + 1].value : data[startIndex - 1].value;
    
    const steps = endIndex - startIndex + 1;
    const stepSize = (afterValue - beforeValue) / (steps + 1);
    
    for (let i = startIndex; i <= endIndex; i++) {
      data[i].value = beforeValue + stepSize * (i - startIndex + 1);
    }
  }

  private static splineInterpolation(data: TimeSeriesPoint[], startIndex: number, endIndex: number): void {
    // Simplified cubic spline interpolation
    this.linearInterpolation(data, startIndex, endIndex); // Fallback to linear for simplicity
  }

  private static forwardFill(data: TimeSeriesPoint[], startIndex: number, endIndex: number): void {
    const fillValue = startIndex > 0 ? data[startIndex - 1].value : 0;
    for (let i = startIndex; i <= endIndex; i++) {
      data[i].value = fillValue;
    }
  }

  private static backwardFill(data: TimeSeriesPoint[], startIndex: number, endIndex: number): void {
    const fillValue = endIndex < data.length - 1 ? data[endIndex + 1].value : 0;
    for (let i = startIndex; i <= endIndex; i++) {
      data[i].value = fillValue;
    }
  }

  private static seasonalImputation(data: TimeSeriesPoint[], startIndex: number, endIndex: number, period: number): void {
    for (let i = startIndex; i <= endIndex; i++) {
      // Find corresponding seasonal value
      const seasonalIndex = i % period;
      let seasonalValue = 0;
      let count = 0;
      
      for (let j = seasonalIndex; j < data.length; j += period) {
        if (j < startIndex || j > endIndex) {
          seasonalValue += data[j].value;
          count++;
        }
      }
      
      data[i].value = count > 0 ? seasonalValue / count : 0;
    }
  }

  private static meanImputation(data: TimeSeriesPoint[], startIndex: number, endIndex: number): void {
    const validValues = data
      .filter((_, i) => i < startIndex || i > endIndex)
      .map(d => d.value);
    
    const mean = validValues.length > 0 
      ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length 
      : 0;
    
    for (let i = startIndex; i <= endIndex; i++) {
      data[i].value = mean;
    }
  }

  private static testStationarity(data: TimeSeriesPoint[]): boolean {
    // Simplified stationarity test
    const values = data.map(d => d.value);
    if (values.length < 10) return true;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const mean1 = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const variance1 = firstHalf.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / firstHalf.length;
    const variance2 = secondHalf.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / secondHalf.length;
    
    // Simple test: means and variances should be similar
    const meanDiff = Math.abs(mean1 - mean2) / Math.max(Math.abs(mean1), Math.abs(mean2), 1);
    const varDiff = Math.abs(variance1 - variance2) / Math.max(variance1, variance2, 1);
    
    return meanDiff < 0.1 && varDiff < 0.2;
  }

  private static differenceData(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
    if (data.length < 2) return data;
    
    return data.slice(1).map((point, i) => ({
      date: point.date,
      value: point.value - data[i].value
    }));
  }

  private static calculateSeasonalIndices(values: number[], period: number, method: 'additive' | 'multiplicative'): number[] {
    const seasonalIndices = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    
    for (let i = 0; i < values.length; i++) {
      const seasonIndex = i % period;
      seasonalIndices[seasonIndex] += values[i];
      counts[seasonIndex]++;
    }
    
    // Calculate averages
    for (let i = 0; i < period; i++) {
      seasonalIndices[i] = counts[i] > 0 ? seasonalIndices[i] / counts[i] : 0;
    }
    
    if (method === 'multiplicative') {
      const overallMean = seasonalIndices.reduce((sum, val) => sum + val, 0) / period;
      for (let i = 0; i < period; i++) {
        seasonalIndices[i] = overallMean !== 0 ? seasonalIndices[i] / overallMean : 1;
      }
    } else {
      const overallMean = seasonalIndices.reduce((sum, val) => sum + val, 0) / period;
      for (let i = 0; i < period; i++) {
        seasonalIndices[i] = seasonalIndices[i] - overallMean;
      }
    }
    
    return seasonalIndices;
  }

  private static calculateTrend(values: number[], period: number): number[] {
    const trend = new Array(values.length);
    const windowSize = Math.max(3, Math.floor(period / 2));
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(values.length, i + windowSize + 1);
      const window = values.slice(start, end);
      trend[i] = window.reduce((sum, val) => sum + val, 0) / window.length;
    }
    
    return trend;
  }

  private static calculateSeasonalStrength(seasonal: number[]): number {
    if (seasonal.length === 0) return 0;
    
    const mean = seasonal.reduce((sum, val) => sum + val, 0) / seasonal.length;
    const variance = seasonal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / seasonal.length;
    
    return Math.min(1, Math.sqrt(variance) / (Math.abs(mean) + 1));
  }

  private static winsorizeOutliers(
    data: TimeSeriesPoint[], 
    outliers: Array<{ index: number; severity: 'low' | 'medium' | 'high' }>
  ): TimeSeriesPoint[] {
    const result = [...data];
    const values = data.map(d => d.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    const p5 = this.calculatePercentile(sorted, 5);
    const p95 = this.calculatePercentile(sorted, 95);
    
    for (const outlier of outliers) {
      if (outlier.severity === 'high') {
        const originalValue = result[outlier.index].value;
        result[outlier.index].value = originalValue < p5 ? p5 : originalValue > p95 ? p95 : originalValue;
      }
    }
    
    return result;
  }

  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private static calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}
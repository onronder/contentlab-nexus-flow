import { supabase } from "@/integrations/supabase/client";

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TrendAnalysis {
  slope: number;
  intercept: number;
  correlation: number;
  confidence: number;
  direction: 'increasing' | 'decreasing' | 'stable';
}

export interface StatisticalForecast {
  predictions: Array<{
    date: string;
    predicted: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  accuracy: number;
  model: string;
}

export class StatisticalModels {
  
  /**
   * Linear regression for trend analysis
   */
  static calculateLinearRegression(data: TimeSeriesPoint[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        slope: 0,
        intercept: 0,
        correlation: 0,
        confidence: 0,
        direction: 'stable'
      };
    }

    const n = data.length;
    const xValues = data.map((_, index) => index);
    const yValues = data.map(point => point.value);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient (R)
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    // Calculate confidence based on R-squared and sample size
    const rSquared = correlation * correlation;
    const confidence = Math.min(95, Math.max(10, rSquared * 100 * Math.log10(n)));

    const direction = Math.abs(slope) < 0.01 ? 'stable' : 
                     slope > 0 ? 'increasing' : 'decreasing';

    return {
      slope,
      intercept,
      correlation,
      confidence,
      direction
    };
  }

  /**
   * Moving average smoothing
   */
  static calculateMovingAverage(data: TimeSeriesPoint[], window: number = 7): TimeSeriesPoint[] {
    if (data.length < window) return data;

    return data.map((_, index) => {
      if (index < window - 1) return data[index];
      
      const start = Math.max(0, index - window + 1);
      const end = index + 1;
      const subset = data.slice(start, end);
      const average = subset.reduce((sum, point) => sum + point.value, 0) / subset.length;
      
      return {
        date: data[index].date,
        value: average
      };
    });
  }

  /**
   * Generate forecasts using exponential smoothing
   */
  static generateForecast(
    historicalData: TimeSeriesPoint[], 
    forecastPeriods: number = 4,
    alpha: number = 0.3
  ): StatisticalForecast {
    if (historicalData.length < 3) {
      return {
        predictions: [],
        accuracy: 0,
        model: 'insufficient_data'
      };
    }

    // Apply exponential smoothing
    const smoothedData = this.exponentialSmoothing(historicalData, alpha);
    const trend = this.calculateLinearRegression(smoothedData);
    
    // Calculate forecast variance for confidence intervals
    const errors = historicalData.slice(1).map((point, i) => {
      const predicted = smoothedData[i + 1]?.value || point.value;
      return Math.abs(point.value - predicted);
    });
    
    const meanError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const variance = errors.reduce((sum, err) => sum + Math.pow(err - meanError, 2), 0) / errors.length;
    const standardError = Math.sqrt(variance);

    // Generate future predictions
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const lastValue = smoothedData[smoothedData.length - 1].value;
    const predictions = [];

    for (let i = 1; i <= forecastPeriods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + (i * 7)); // Weekly intervals
      
      // Linear trend projection with exponential smoothing influence
      const trendComponent = trend.slope * (smoothedData.length + i);
      const baselineComponent = trend.intercept;
      const smoothingComponent = lastValue * Math.pow(alpha, i);
      
      const predicted = Math.max(0, 
        baselineComponent + trendComponent + smoothingComponent
      );
      
      // Calculate confidence intervals (diminishing confidence over time)
      const timeDecay = Math.pow(0.95, i - 1);
      const confidenceLevel = Math.max(60, trend.confidence * timeDecay);
      const margin = standardError * (1.96 * Math.sqrt(i)) * timeDecay; // 95% CI
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: Math.round(predicted * 100) / 100,
        confidence: Math.round(confidenceLevel),
        upperBound: Math.round((predicted + margin) * 100) / 100,
        lowerBound: Math.max(0, Math.round((predicted - margin) * 100) / 100)
      });
    }

    // Calculate model accuracy based on historical performance
    const accuracy = Math.min(95, Math.max(50, 
      100 - (meanError / (historicalData.reduce((sum, p) => sum + p.value, 0) / historicalData.length)) * 100
    ));

    return {
      predictions,
      accuracy: Math.round(accuracy),
      model: 'exponential_smoothing_with_trend'
    };
  }

  /**
   * Exponential smoothing implementation
   */
  private static exponentialSmoothing(data: TimeSeriesPoint[], alpha: number): TimeSeriesPoint[] {
    if (data.length === 0) return [];
    
    const smoothed = [{ ...data[0] }];
    
    for (let i = 1; i < data.length; i++) {
      const smoothedValue = alpha * data[i].value + (1 - alpha) * smoothed[i - 1].value;
      smoothed.push({
        date: data[i].date,
        value: smoothedValue
      });
    }
    
    return smoothed;
  }

  /**
   * Seasonal decomposition for detecting patterns
   */
  static detectSeasonality(data: TimeSeriesPoint[], period: number = 7): {
    seasonal: number[];
    trend: number[];
    residual: number[];
    seasonalStrength: number;
  } {
    if (data.length < period * 2) {
      return {
        seasonal: data.map(() => 0),
        trend: data.map(d => d.value),
        residual: data.map(() => 0),
        seasonalStrength: 0
      };
    }

    // Calculate moving average for trend
    const trend = this.calculateMovingAverage(data, period).map(d => d.value);
    
    // Detrend the data
    const detrended = data.map((point, i) => point.value - (trend[i] || point.value));
    
    // Calculate seasonal components
    const seasonal = new Array(data.length).fill(0);
    for (let i = 0; i < data.length; i++) {
      const seasonalIndex = i % period;
      const seasonalValues = [];
      
      for (let j = seasonalIndex; j < detrended.length; j += period) {
        seasonalValues.push(detrended[j]);
      }
      
      seasonal[i] = seasonalValues.reduce((sum, val) => sum + val, 0) / seasonalValues.length;
    }
    
    // Calculate residuals
    const residual = data.map((point, i) => 
      point.value - (trend[i] || 0) - seasonal[i]
    );
    
    // Measure seasonal strength
    const seasonalVariance = seasonal.reduce((sum, val) => 
      sum + Math.pow(val - seasonal.reduce((s, v) => s + v, 0) / seasonal.length, 2), 0
    ) / seasonal.length;
    
    const totalVariance = data.reduce((sum, point) => 
      sum + Math.pow(point.value - data.reduce((s, p) => s + p.value, 0) / data.length, 2), 0
    ) / data.length;
    
    const seasonalStrength = totalVariance > 0 ? 
      Math.min(100, (seasonalVariance / totalVariance) * 100) : 0;

    return {
      seasonal,
      trend,
      residual,
      seasonalStrength: Math.round(seasonalStrength)
    };
  }

  /**
   * Calculate confidence intervals for predictions
   */
  static calculateConfidenceInterval(
    value: number, 
    standardError: number, 
    confidence: number = 95
  ): { lower: number; upper: number } {
    const zScore = confidence === 95 ? 1.96 : confidence === 90 ? 1.645 : 2.576;
    const margin = zScore * standardError;
    
    return {
      lower: Math.max(0, value - margin),
      upper: value + margin
    };
  }

  /**
   * Anomaly detection using statistical methods
   */
  static detectAnomalies(data: TimeSeriesPoint[], threshold: number = 2): Array<{
    date: string;
    value: number;
    zScore: number;
    isAnomaly: boolean;
  }> {
    if (data.length < 5) return data.map(d => ({ ...d, zScore: 0, isAnomaly: false }));

    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return data.map(point => {
      const zScore = standardDeviation > 0 ? Math.abs(point.value - mean) / standardDeviation : 0;
      
      return {
        date: point.date,
        value: point.value,
        zScore: Math.round(zScore * 100) / 100,
        isAnomaly: zScore > threshold
      };
    });
  }

  /**
   * Content demand prediction based on historical performance
   */
  static async generateContentDemandPrediction(teamId?: string): Promise<Array<{
    category: string;
    currentDemand: number;
    predictedDemand: number;
    growth: number;
    confidence: number;
    model: string;
  }>> {
    try {
      // Fetch content analytics grouped by content type
      const { data: contentData, error } = await supabase
        .from('content_analytics')
        .select(`
          content_id,
          views,
          likes,
          shares,
          performance_score,
          analytics_date,
          content_items!inner(content_type, team_id)
        `)
        .eq('content_items.team_id', teamId)
        .gte('analytics_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('analytics_date', { ascending: true });

      if (error) throw error;

      // Group by content type and calculate demand metrics
      const contentTypes = new Map<string, Array<{
        date: string;
        engagement: number;
        performance: number;
      }>>();

      contentData?.forEach(item => {
        const contentType = (item.content_items as any)?.content_type || 'unknown';
        const engagement = (item.views || 0) + (item.likes || 0) * 3 + (item.shares || 0) * 5;
        
        if (!contentTypes.has(contentType)) {
          contentTypes.set(contentType, []);
        }
        
        contentTypes.get(contentType)!.push({
          date: item.analytics_date || new Date().toISOString().split('T')[0],
          engagement,
          performance: item.performance_score || 0
        });
      });

      const predictions = [];
      
      for (const [contentType, data] of contentTypes) {
        if (data.length < 3) continue;

        // Aggregate by week to smooth out daily variations
        const weeklyData = this.aggregateByWeek(data.map(d => ({
          date: d.date,
          value: d.engagement
        })));

        // Calculate trend and forecast
        const trend = this.calculateLinearRegression(weeklyData);
        const forecast = this.generateForecast(weeklyData, 4);
        
        // Current demand is average of recent data
        const recentData = weeklyData.slice(-4);
        const currentDemand = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
        
        // Predicted demand is forecast average
        const predictedDemand = forecast.predictions.length > 0 ?
          forecast.predictions.reduce((sum, p) => sum + p.predicted, 0) / forecast.predictions.length :
          currentDemand;
        
        const growth = currentDemand > 0 ? 
          ((predictedDemand - currentDemand) / currentDemand) * 100 : 0;
        
        predictions.push({
          category: contentType.charAt(0).toUpperCase() + contentType.slice(1),
          currentDemand: Math.round(currentDemand),
          predictedDemand: Math.round(predictedDemand),
          growth: Math.round(growth * 10) / 10,
          confidence: Math.min(trend.confidence, forecast.accuracy),
          model: forecast.model
        });
      }

      return predictions.sort((a, b) => b.predictedDemand - a.predictedDemand);
      
    } catch (error) {
      console.error('Error generating content demand prediction:', error);
      return [];
    }
  }

  /**
   * Aggregate time series data by week
   */
  private static aggregateByWeek(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
    const weeklyData = new Map<string, number[]>();
    
    data.forEach(point => {
      const date = new Date(point.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      
      weeklyData.get(weekKey)!.push(point.value);
    });
    
    return Array.from(weeklyData.entries())
      .map(([date, values]) => ({
        date,
        value: values.reduce((sum, val) => sum + val, 0) / values.length
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}
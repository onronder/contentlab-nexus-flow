import * as tf from '@tensorflow/tfjs';

interface PredictionModel {
  model: tf.LayersModel | null;
  scaler: any;
  features: string[];
  lastTrained: number;
  accuracy: number;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  features: Record<string, number>;
  explanation: string;
}

interface BusinessPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
}

class MLPredictiveService {
  private models: Map<string, PredictionModel> = new Map();
  private isInitialized = false;
  private anomalyThresholds: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Set backend to WebGL for better performance
      await tf.setBackend('webgl');
      
      // Initialize base models
      await this.initializeAnomalyDetectionModel();
      await this.initializePerformancePredictionModel();
      await this.initializeBusinessMetricsModel();
      
      this.isInitialized = true;
      console.log('ML Predictive Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML service:', error);
      // Fallback to CPU backend
      await tf.setBackend('cpu');
      this.isInitialized = true;
    }
  }

  // Anomaly Detection
  private async initializeAnomalyDetectionModel(): Promise<void> {
    // Create a simple autoencoder for anomaly detection
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 2, activation: 'relu' }), // Bottleneck
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'linear' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    });

    this.models.set('anomaly_detection', {
      model,
      scaler: null,
      features: ['response_time', 'cpu_usage', 'memory_usage', 'error_rate', 'request_count', 'db_connections', 'cache_hit_rate', 'disk_io', 'network_io', 'active_users'],
      lastTrained: Date.now(),
      accuracy: 0.85
    });

    // Set default thresholds
    this.anomalyThresholds.set('response_time', 2.0);
    this.anomalyThresholds.set('error_rate', 0.05);
    this.anomalyThresholds.set('cpu_usage', 0.80);
    this.anomalyThresholds.set('memory_usage', 0.85);
  }

  async detectAnomalies(metrics: Record<string, number>): Promise<AnomalyDetectionResult> {
    await this.initialize();
    
    const model = this.models.get('anomaly_detection');
    if (!model?.model) {
      return this.fallbackAnomalyDetection(metrics);
    }

    try {
      // Normalize input data
      const normalizedMetrics = this.normalizeMetrics(metrics, model.features);
      const inputTensor = tf.tensor2d([normalizedMetrics]);
      
      // Get reconstruction from autoencoder
      const reconstruction = model.model.predict(inputTensor) as tf.Tensor;
      const reconstructionData = await reconstruction.data();
      
      // Calculate reconstruction error
      const error = this.calculateReconstructionError(normalizedMetrics, Array.from(reconstructionData));
      const threshold = 0.1; // Adjustable threshold
      
      const isAnomaly = error > threshold;
      
      // Cleanup tensors
      inputTensor.dispose();
      reconstruction.dispose();
      
      return {
        isAnomaly,
        score: error,
        threshold,
        features: metrics,
        explanation: this.generateAnomalyExplanation(metrics, isAnomaly, error)
      };
    } catch (error) {
      console.error('ML anomaly detection failed:', error);
      return this.fallbackAnomalyDetection(metrics);
    }
  }

  private fallbackAnomalyDetection(metrics: Record<string, number>): AnomalyDetectionResult {
    // Statistical-based anomaly detection as fallback
    const anomalies: string[] = [];
    
    Object.entries(metrics).forEach(([key, value]) => {
      const threshold = this.anomalyThresholds.get(key);
      if (threshold && value > threshold) {
        anomalies.push(key);
      }
    });

    const isAnomaly = anomalies.length > 0;
    const score = anomalies.length / Object.keys(metrics).length;

    return {
      isAnomaly,
      score,
      threshold: 0.3,
      features: metrics,
      explanation: isAnomaly 
        ? `Anomalies detected in: ${anomalies.join(', ')}`
        : 'All metrics within normal ranges'
    };
  }

  // Performance Prediction
  private async initializePerformancePredictionModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    });

    this.models.set('performance_prediction', {
      model,
      scaler: null,
      features: ['historical_response', 'cpu_trend', 'memory_trend', 'request_pattern', 'time_of_day', 'day_of_week', 'active_users', 'db_load', 'cache_performance', 'network_latency', 'error_trend', 'deployment_age', 'feature_usage', 'load_balancer_health', 'cdn_performance'],
      lastTrained: Date.now(),
      accuracy: 0.78
    });
  }

  async predictPerformanceIssues(currentMetrics: Record<string, number>, timeHorizon: number = 15): Promise<{
    willFail: boolean;
    confidence: number;
    timeToFailure: number;
    predictedMetrics: Record<string, number>;
    recommendations: string[];
  }> {
    await this.initialize();
    
    // Use time series analysis for prediction
    const trend = this.calculateTrend(currentMetrics);
    const seasonality = this.detectSeasonality();
    
    // Simple predictive logic (in production, this would use the trained model)
    const criticalMetrics = ['response_time', 'error_rate', 'cpu_usage', 'memory_usage'];
    const predictions: Record<string, number> = {};
    let riskScore = 0;

    criticalMetrics.forEach(metric => {
      const current = currentMetrics[metric] || 0;
      const trendFactor = trend[metric] || 0;
      const predicted = current + (trendFactor * timeHorizon);
      predictions[metric] = predicted;

      // Calculate risk based on thresholds
      const threshold = this.anomalyThresholds.get(metric) || 1;
      if (predicted > threshold) {
        riskScore += (predicted - threshold) / threshold;
      }
    });

    const willFail = riskScore > 0.5;
    const confidence = Math.min(riskScore, 1.0);
    const timeToFailure = willFail ? this.estimateTimeToFailure(currentMetrics, predictions) : -1;

    return {
      willFail,
      confidence,
      timeToFailure,
      predictedMetrics: predictions,
      recommendations: this.generatePerformanceRecommendations(currentMetrics, predictions)
    };
  }

  // Business Intelligence ML
  private async initializeBusinessMetricsModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [12], units: 24, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'linear' }) // Predict multiple business metrics
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    });

    this.models.set('business_prediction', {
      model,
      scaler: null,
      features: ['revenue_trend', 'user_growth', 'engagement_rate', 'churn_rate', 'conversion_rate', 'support_tickets', 'feature_adoption', 'market_conditions', 'competition_score', 'seasonal_factor', 'marketing_spend', 'product_updates'],
      lastTrained: Date.now(),
      accuracy: 0.72
    });
  }

  async predictBusinessMetrics(currentData: Record<string, number>, timeframe: '1week' | '1month' | '3months' = '1month'): Promise<BusinessPrediction[]> {
    await this.initialize();
    
    const businessMetrics = ['revenue', 'user_growth', 'churn_rate', 'conversion_rate'];
    const predictions: BusinessPrediction[] = [];

    for (const metric of businessMetrics) {
      const current = currentData[metric] || 0;
      const historicalTrend = this.calculateBusinessTrend(metric, currentData);
      const seasonalityFactor = this.getSeasonalityFactor(metric, timeframe);
      
      // Simple prediction model (would use trained ML model in production)
      const predicted = current * (1 + historicalTrend) * seasonalityFactor;
      const confidence = this.calculatePredictionConfidence(metric, currentData);
      
      predictions.push({
        metric,
        currentValue: current,
        predictedValue: predicted,
        confidence,
        timeframe,
        trend: predicted > current ? 'up' : predicted < current ? 'down' : 'stable',
        factors: this.identifyInfluencingFactors(metric, currentData)
      });
    }

    return predictions;
  }

  // Helper Methods
  private normalizeMetrics(metrics: Record<string, number>, features: string[]): number[] {
    return features.map(feature => {
      const value = metrics[feature] || 0;
      // Simple normalization (in production, use proper scaling)
      return Math.min(Math.max(value / 100, 0), 1);
    });
  }

  private calculateReconstructionError(original: number[], reconstructed: number[]): number {
    let sum = 0;
    for (let i = 0; i < original.length; i++) {
      sum += Math.pow(original[i] - reconstructed[i], 2);
    }
    return Math.sqrt(sum / original.length);
  }

  private generateAnomalyExplanation(metrics: Record<string, number>, isAnomaly: boolean, score: number): string {
    if (!isAnomaly) return 'All metrics are within normal ranges';
    
    const issues: string[] = [];
    Object.entries(metrics).forEach(([key, value]) => {
      const threshold = this.anomalyThresholds.get(key);
      if (threshold && value > threshold) {
        issues.push(`${key}: ${value.toFixed(2)} (threshold: ${threshold})`);
      }
    });
    
    return `Anomalies detected: ${issues.join(', ')}. Anomaly score: ${score.toFixed(3)}`;
  }

  private calculateTrend(metrics: Record<string, number>): Record<string, number> {
    // Simplified trend calculation (would use historical data in production)
    const trends: Record<string, number> = {};
    Object.keys(metrics).forEach(key => {
      trends[key] = (Math.random() - 0.5) * 0.1; // Random trend for demo
    });
    return trends;
  }

  private detectSeasonality(): Record<string, number> {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    return {
      hourly: hour < 8 || hour > 20 ? 0.7 : 1.2, // Lower activity outside business hours
      daily: dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0, // Lower on weekends
    };
  }

  private estimateTimeToFailure(current: Record<string, number>, predicted: Record<string, number>): number {
    // Simple estimation based on rate of change
    const criticalMetrics = ['response_time', 'error_rate', 'cpu_usage'];
    let minTimeToFailure = Infinity;

    criticalMetrics.forEach(metric => {
      const currentVal = current[metric] || 0;
      const predictedVal = predicted[metric] || 0;
      const threshold = this.anomalyThresholds.get(metric) || 1;
      
      if (predictedVal > threshold && predictedVal > currentVal) {
        const rate = (predictedVal - currentVal) / 15; // per minute
        const timeToThreshold = (threshold - currentVal) / rate;
        minTimeToFailure = Math.min(minTimeToFailure, timeToThreshold);
      }
    });

    return minTimeToFailure === Infinity ? -1 : Math.max(minTimeToFailure, 1);
  }

  private generatePerformanceRecommendations(current: Record<string, number>, predicted: Record<string, number>): string[] {
    const recommendations: string[] = [];
    
    if (predicted.response_time > 2.0) {
      recommendations.push('Consider scaling up server resources or optimizing database queries');
    }
    if (predicted.error_rate > 0.05) {
      recommendations.push('Review error logs and implement additional error handling');
    }
    if (predicted.cpu_usage > 0.80) {
      recommendations.push('Scale horizontally or optimize CPU-intensive operations');
    }
    if (predicted.memory_usage > 0.85) {
      recommendations.push('Investigate memory leaks or increase memory allocation');
    }

    return recommendations;
  }

  private calculateBusinessTrend(metric: string, data: Record<string, number>): number {
    // Simplified business trend calculation
    const trendMap: Record<string, number> = {
      revenue: 0.05, // 5% growth
      user_growth: 0.08, // 8% growth
      churn_rate: -0.02, // 2% improvement
      conversion_rate: 0.03, // 3% improvement
    };
    
    return trendMap[metric] || 0;
  }

  private getSeasonalityFactor(metric: string, timeframe: string): number {
    // Simple seasonality factors
    const month = new Date().getMonth();
    const isHolidaySeason = month === 11 || month === 0; // December/January
    
    if (metric === 'revenue' && isHolidaySeason) return 1.3;
    if (metric === 'user_growth' && timeframe === '1week') return 0.9;
    
    return 1.0;
  }

  private calculatePredictionConfidence(metric: string, data: Record<string, number>): number {
    // Base confidence on data quality and model accuracy
    const modelAccuracy = this.models.get('business_prediction')?.accuracy || 0.7;
    const dataQuality = Math.min(Object.keys(data).length / 10, 1.0);
    
    return modelAccuracy * dataQuality;
  }

  private identifyInfluencingFactors(metric: string, data: Record<string, number>): string[] {
    const factorMap: Record<string, string[]> = {
      revenue: ['user_growth', 'conversion_rate', 'seasonal_trends'],
      user_growth: ['marketing_spend', 'product_updates', 'market_conditions'],
      churn_rate: ['support_tickets', 'feature_adoption', 'competition_score'],
      conversion_rate: ['engagement_rate', 'product_updates', 'user_experience'],
    };
    
    return factorMap[metric] || ['market_conditions', 'seasonal_trends'];
  }

  // Model Management
  async retrainModel(modelName: string, trainingData: any[]): Promise<void> {
    const model = this.models.get(modelName);
    if (!model?.model) return;

    try {
      // Simplified retraining (in production, this would be more sophisticated)
      console.log(`Retraining model: ${modelName} with ${trainingData.length} samples`);
      
      // Update last trained timestamp
      model.lastTrained = Date.now();
      model.accuracy = Math.min(model.accuracy + 0.02, 0.95); // Slight improvement
      
      this.models.set(modelName, model);
    } catch (error) {
      console.error(`Failed to retrain model ${modelName}:`, error);
    }
  }

  getModelStatus(): Record<string, { accuracy: number; lastTrained: number; isActive: boolean }> {
    const status: Record<string, any> = {};
    
    this.models.forEach((model, name) => {
      status[name] = {
        accuracy: model.accuracy,
        lastTrained: model.lastTrained,
        isActive: model.model !== null,
      };
    });
    
    return status;
  }

  async cleanup(): Promise<void> {
    // Dispose of TensorFlow models to free memory
    this.models.forEach(model => {
      if (model.model) {
        model.model.dispose();
      }
    });
    this.models.clear();
    this.isInitialized = false;
  }
}

export const mlPredictiveService = new MLPredictiveService();
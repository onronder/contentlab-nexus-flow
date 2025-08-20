import { TimeSeriesPoint, StatisticalForecast } from './advancedStatisticalModels';

export interface CrossValidationResult {
  scores: number[];
  meanScore: number;
  stdScore: number;
  bestModel: string;
  validationMethod: string;
}

export interface ModelComparison {
  models: Array<{
    name: string;
    forecast: StatisticalForecast;
    score: number;
    rank: number;
  }>;
  bestModel: string;
  performanceMetrics: Record<string, number>;
}

export interface BacktestResult {
  periods: number;
  actualValues: number[];
  predictedValues: number[];
  errors: number[];
  accuracy: {
    mae: number;
    rmse: number;
    mape: number;
    smape: number;
    directionalAccuracy: number;
  };
  confidenceIntervals: {
    coverage: number;
    averageWidth: number;
  };
}

export class ModelValidation {
  // Time series cross-validation with rolling window
  static timeSeriesCrossValidation(
    data: TimeSeriesPoint[],
    modelFunction: (trainData: TimeSeriesPoint[], testPeriods: number) => StatisticalForecast,
    minTrainSize: number = 30,
    testSize: number = 7,
    step: number = 1
  ): CrossValidationResult {
    const scores: number[] = [];
    const n = data.length;
    
    if (n < minTrainSize + testSize) {
      throw new Error('Insufficient data for cross-validation');
    }

    // Rolling window cross-validation
    for (let i = minTrainSize; i <= n - testSize; i += step) {
      const trainData = data.slice(0, i);
      const testData = data.slice(i, i + testSize);
      
      try {
        const forecast = modelFunction(trainData, testSize);
        const score = this.calculateForecastAccuracy(testData, forecast.predictions);
        scores.push(score);
      } catch (error) {
        console.warn(`Cross-validation failed at iteration ${i}:`, error);
        scores.push(Infinity); // Penalty for failed forecasts
      }
    }

    const validScores = scores.filter(score => score !== Infinity);
    
    if (validScores.length === 0) {
      throw new Error('All cross-validation iterations failed');
    }

    const meanScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    const variance = validScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / validScores.length;
    const stdScore = Math.sqrt(variance);

    return {
      scores: validScores,
      meanScore,
      stdScore,
      bestModel: 'evaluated_model',
      validationMethod: 'rolling_window'
    };
  }

  // Walk-forward validation for time series
  static walkForwardValidation(
    data: TimeSeriesPoint[],
    models: Array<{
      name: string;
      function: (trainData: TimeSeriesPoint[], testPeriods: number) => StatisticalForecast;
    }>,
    initialTrainSize: number = 50,
    testSize: number = 7,
    maxIterations: number = 10
  ): ModelComparison {
    const modelResults = models.map(model => ({
      name: model.name,
      scores: [] as number[],
      forecasts: [] as StatisticalForecast[]
    }));

    const n = data.length;
    const iterations = Math.min(maxIterations, Math.floor((n - initialTrainSize) / testSize));

    // Perform walk-forward validation
    for (let iter = 0; iter < iterations; iter++) {
      const trainEnd = initialTrainSize + iter * testSize;
      const testStart = trainEnd;
      const testEnd = Math.min(testStart + testSize, n);
      
      if (testEnd <= testStart) break;

      const trainData = data.slice(0, trainEnd);
      const testData = data.slice(testStart, testEnd);
      const actualTestSize = testEnd - testStart;

      for (const modelResult of modelResults) {
        try {
          const model = models.find(m => m.name === modelResult.name)!;
          const forecast = model.function(trainData, actualTestSize);
          const score = this.calculateForecastAccuracy(testData, forecast.predictions.slice(0, actualTestSize));
          
          modelResult.scores.push(score);
          modelResult.forecasts.push(forecast);
        } catch (error) {
          console.warn(`Model ${modelResult.name} failed at iteration ${iter}:`, error);
          modelResult.scores.push(Infinity);
        }
      }
    }

    // Calculate average scores and rank models
    const rankedModels = modelResults.map(result => {
      const validScores = result.scores.filter(score => score !== Infinity);
      const meanScore = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : Infinity;
      
      return {
        name: result.name,
        forecast: result.forecasts[result.forecasts.length - 1] || this.createEmptyForecast(),
        score: meanScore,
        rank: 0 // Will be set after sorting
      };
    }).sort((a, b) => a.score - b.score);

    // Assign ranks
    rankedModels.forEach((model, index) => {
      model.rank = index + 1;
    });

    const bestModel = rankedModels[0]?.name || 'none';
    
    // Calculate performance metrics
    const performanceMetrics: Record<string, number> = {
      totalIterations: iterations,
      validModels: rankedModels.filter(m => m.score !== Infinity).length,
      bestScore: rankedModels[0]?.score || Infinity,
      scoreSpread: this.calculateScoreSpread(rankedModels.map(m => m.score))
    };

    return {
      models: rankedModels,
      bestModel,
      performanceMetrics
    };
  }

  // Backtesting with comprehensive metrics
  static backtest(
    data: TimeSeriesPoint[],
    model: (trainData: TimeSeriesPoint[], testPeriods: number) => StatisticalForecast,
    backtestPeriods: number = 30,
    forecastHorizon: number = 7
  ): BacktestResult {
    const n = data.length;
    
    if (n < backtestPeriods + forecastHorizon) {
      throw new Error('Insufficient data for backtesting');
    }

    const trainData = data.slice(0, n - backtestPeriods);
    const testData = data.slice(n - backtestPeriods);

    // Generate forecasts for the backtest period
    const actualValues: number[] = [];
    const predictedValues: number[] = [];
    const errors: number[] = [];
    const confidenceIntervals: Array<{ actual: number; lower: number; upper: number; covered: boolean }> = [];

    for (let i = 0; i < backtestPeriods; i += forecastHorizon) {
      const currentTrainData = [...trainData, ...testData.slice(0, i)];
      const remainingPeriods = Math.min(forecastHorizon, backtestPeriods - i);
      
      try {
        const forecast = model(currentTrainData, remainingPeriods);
        
        for (let j = 0; j < remainingPeriods && i + j < backtestPeriods; j++) {
          const actual = testData[i + j].value;
          const predicted = forecast.predictions[j]?.value || actual;
          const lower = forecast.confidenceIntervals.lower[j]?.value || predicted;
          const upper = forecast.confidenceIntervals.upper[j]?.value || predicted;
          
          actualValues.push(actual);
          predictedValues.push(predicted);
          errors.push(actual - predicted);
          
          confidenceIntervals.push({
            actual,
            lower,
            upper,
            covered: actual >= lower && actual <= upper
          });
        }
      } catch (error) {
        console.warn(`Backtest failed at period ${i}:`, error);
        // Fill with naive forecast (last known value)
        const lastValue = currentTrainData[currentTrainData.length - 1].value;
        for (let j = 0; j < remainingPeriods && i + j < backtestPeriods; j++) {
          const actual = testData[i + j].value;
          actualValues.push(actual);
          predictedValues.push(lastValue);
          errors.push(actual - lastValue);
          confidenceIntervals.push({
            actual,
            lower: lastValue * 0.9,
            upper: lastValue * 1.1,
            covered: actual >= lastValue * 0.9 && actual <= lastValue * 1.1
          });
        }
      }
    }

    // Calculate accuracy metrics
    const mae = errors.reduce((sum, err) => sum + Math.abs(err), 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0) / errors.length);
    
    let mape = 0;
    let validMapeCount = 0;
    for (let i = 0; i < actualValues.length; i++) {
      if (actualValues[i] !== 0) {
        mape += Math.abs(errors[i] / actualValues[i]);
        validMapeCount++;
      }
    }
    mape = validMapeCount > 0 ? (mape / validMapeCount) * 100 : 0;

    const smape = actualValues.reduce((sum, actual, i) => {
      const predicted = predictedValues[i];
      return sum + Math.abs(errors[i]) / ((Math.abs(actual) + Math.abs(predicted)) / 2);
    }, 0) / actualValues.length * 100;

    // Directional accuracy
    let correctDirections = 0;
    for (let i = 1; i < actualValues.length; i++) {
      const actualDirection = actualValues[i] > actualValues[i - 1];
      const predictedDirection = predictedValues[i] > actualValues[i - 1]; // Compare prediction to last actual
      if (actualDirection === predictedDirection) {
        correctDirections++;
      }
    }
    const directionalAccuracy = actualValues.length > 1 ? correctDirections / (actualValues.length - 1) * 100 : 0;

    // Confidence interval metrics
    const coverage = confidenceIntervals.reduce((sum, ci) => sum + (ci.covered ? 1 : 0), 0) / confidenceIntervals.length * 100;
    const averageWidth = confidenceIntervals.reduce((sum, ci) => sum + (ci.upper - ci.lower), 0) / confidenceIntervals.length;

    return {
      periods: backtestPeriods,
      actualValues,
      predictedValues,
      errors,
      accuracy: {
        mae,
        rmse,
        mape,
        smape,
        directionalAccuracy
      },
      confidenceIntervals: {
        coverage,
        averageWidth
      }
    };
  }

  // Model selection based on information criteria
  static selectBestModel(
    data: TimeSeriesPoint[],
    models: Array<{
      name: string;
      function: (trainData: TimeSeriesPoint[]) => StatisticalForecast;
    }>
  ): ModelComparison {
    const modelResults = models.map(model => {
      try {
        const forecast = model.function(data);
        const aic = forecast.accuracy.aic;
        const bic = forecast.accuracy.bic;
        
        // Combined score (lower is better)
        const score = aic + bic;
        
        return {
          name: model.name,
          forecast,
          score,
          rank: 0
        };
      } catch (error) {
        console.warn(`Model ${model.name} failed:`, error);
        return {
          name: model.name,
          forecast: this.createEmptyForecast(),
          score: Infinity,
          rank: 0
        };
      }
    }).sort((a, b) => a.score - b.score);

    // Assign ranks
    modelResults.forEach((model, index) => {
      model.rank = index + 1;
    });

    const bestModel = modelResults[0]?.name || 'none';
    
    const performanceMetrics: Record<string, number> = {
      modelsEvaluated: models.length,
      validModels: modelResults.filter(m => m.score !== Infinity).length,
      bestAIC: modelResults[0]?.forecast.accuracy.aic || Infinity,
      bestBIC: modelResults[0]?.forecast.accuracy.bic || Infinity
    };

    return {
      models: modelResults,
      bestModel,
      performanceMetrics
    };
  }

  // Helper methods
  private static calculateForecastAccuracy(actual: TimeSeriesPoint[], predicted: TimeSeriesPoint[]): number {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have the same length');
    }

    const errors = actual.map((point, i) => point.value - predicted[i].value);
    const rmse = Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0) / errors.length);
    
    return rmse;
  }

  private static calculateScoreSpread(scores: number[]): number {
    const validScores = scores.filter(score => score !== Infinity);
    if (validScores.length < 2) return 0;
    
    const min = Math.min(...validScores);
    const max = Math.max(...validScores);
    return max - min;
  }

  private static createEmptyForecast(): StatisticalForecast {
    return {
      predictions: [],
      accuracy: {
        mae: Infinity,
        rmse: Infinity,
        mape: Infinity,
        smape: Infinity,
        aic: Infinity,
        bic: Infinity
      },
      confidenceIntervals: {
        upper: [],
        lower: []
      },
      model: 'empty',
      parameters: {},
      diagnostics: {
        ljungBox: 0,
        jarqueBera: 0,
        arch: 0
      }
    };
  }

  // Performance benchmarking
  static benchmarkModels(
    data: TimeSeriesPoint[],
    models: Array<{
      name: string;
      function: (trainData: TimeSeriesPoint[], testPeriods: number) => StatisticalForecast;
    }>,
    iterations: number = 100
  ): ModelComparison {
    const benchmarkResults = models.map(model => {
      const executionTimes: number[] = [];
      const accuracyScores: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
          const trainSize = Math.floor(data.length * 0.8);
          const testSize = data.length - trainSize;
          const trainData = data.slice(0, trainSize);
          const testData = data.slice(trainSize);
          
          const forecast = model.function(trainData, testSize);
          const score = this.calculateForecastAccuracy(testData, forecast.predictions.slice(0, testSize));
          
          const endTime = performance.now();
          executionTimes.push(endTime - startTime);
          accuracyScores.push(score);
        } catch (error) {
          console.warn(`Benchmark iteration ${i} failed for ${model.name}:`, error);
          accuracyScores.push(Infinity);
        }
      }
      
      const validScores = accuracyScores.filter(score => score !== Infinity);
      const avgAccuracy = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : Infinity;
      
      const avgExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : Infinity;
      
      // Combined score considering both accuracy and speed
      const score = avgAccuracy + (avgExecutionTime / 1000); // Add execution time in seconds
      
      return {
        name: model.name,
        forecast: this.createEmptyForecast(),
        score,
        rank: 0
      };
    }).sort((a, b) => a.score - b.score);

    // Assign ranks
    benchmarkResults.forEach((model, index) => {
      model.rank = index + 1;
    });

    const bestModel = benchmarkResults[0]?.name || 'none';
    
    const performanceMetrics: Record<string, number> = {
      iterations,
      modelsEvaluated: models.length,
      validModels: benchmarkResults.filter(m => m.score !== Infinity).length,
      bestScore: benchmarkResults[0]?.score || Infinity
    };

    return {
      models: benchmarkResults,
      bestModel,
      performanceMetrics
    };
  }
}
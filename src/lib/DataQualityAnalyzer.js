export const DataQualityAnalyzer = {
  analyzeDataset: (rows) => {
    if (!rows || rows.length === 0) return null;
    
    const isSampled = rows.length > 50000;
    const sample = isSampled ? rows.slice(0, 10000) : rows;
    
    // Total columns based on the first row's keys
    const columns = Object.keys(sample[0] || {});
    const totalCols = columns.length;
    
    // Calculate duplicate rows (using Set for O(1) lookups)
    const rowSet = new Set();
    let duplicateRows = 0;
    for (const row of sample) {
       const str = JSON.stringify(row);
       if (rowSet.has(str)) duplicateRows++;
       else rowSet.add(str);
    }
    
    const colStats = {};
    const issues = [];
    
    columns.forEach(col => {
      let nullCount = 0;
      let numberCount = 0;
      let boolCount = 0;
      let dateCount = 0;
      
      const values = [];
      const valueFreq = new Map();
      
      for (const row of sample) {
        let val = row[col];
        if (val === null || val === undefined || String(val).trim() === '') {
          nullCount++;
        } else {
          val = String(val).trim();
          values.push(val);
          
          // Count frequency for string/categorical analysis
          valueFreq.set(val, (valueFreq.get(val) || 0) + 1);
          
          // Type inference counters
          if (!isNaN(Number(val))) numberCount++;
          else if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') boolCount++;
          else if (!isNaN(Date.parse(val))) dateCount++;
        }
      }
      
      const nullPercentage = (nullCount / sample.length) * 100;
      if (nullPercentage > 10) {
        issues.push(`Column "${col}" has >10% missing values (${nullPercentage.toFixed(1)}%).`);
      }
      
      // Infer type
      let type = 'string';
      if (values.length > 0) {
        if (numberCount > values.length * 0.8) type = 'number';
        else if (boolCount > values.length * 0.8) type = 'boolean';
        else if (dateCount > values.length * 0.8) type = 'date';
      }
      
      const stats = {
        type,
        nullCount,
        nullPercentage
      };
      
      if (type === 'number') {
        const numValues = values.map(Number).filter(n => !isNaN(n)).sort((a,b) => a - b);
        if (numValues.length > 0) {
          stats.min = numValues[0];
          stats.max = numValues[numValues.length - 1];
          stats.mean = numValues.reduce((a,b) => a + b, 0) / numValues.length;
          
          // IQR for Outliers
          if (numValues.length >= 4) {
             const q1 = numValues[Math.floor(numValues.length * 0.25)];
             const q3 = numValues[Math.floor(numValues.length * 0.75)];
             const iqr = q3 - q1;
             const lowerBound = q1 - 1.5 * iqr;
             const upperBound = q3 + 1.5 * iqr;
             stats.outliers = numValues.filter(n => n < lowerBound || n > upperBound).length;
             
             if (stats.outliers > (numValues.length * 0.05)) { // e.g., if >5% are outliers
                issues.push(`Column "${col}" has high outlier count (${stats.outliers}).`);
             }
          } else {
             stats.outliers = 0;
          }
        }
      } else {
        // String/Categorical properties
        stats.cardinality = valueFreq.size;
        stats.topValues = Array.from(valueFreq.entries())
          .sort((a,b) => b[1] - a[1])
          .slice(0, 3)
          .map(entry => ({ value: entry[0], count: entry[1] }));
      }
      
      colStats[col] = stats;
    });
    
    if (duplicateRows > 0) {
       issues.push(`${duplicateRows} duplicate rows detected.`);
    }
    
    return {
      totalRows: isSampled ? sample.length : rows.length, // Display sample size if sampled, wait no: display total, but state it's estimated
      isSampled,
      actualTotalRows: rows.length,
      totalCols,
      duplicateRows,
      colStats,
      issues
    };
  }
};

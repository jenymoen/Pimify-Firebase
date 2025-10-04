// src/components/dashboard/quality-widget.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Filter,
  RefreshCw
} from "lucide-react";
import { useProductStore } from "@/lib/product-store";
import { QualityMetricCard } from "./quality-metric-card";
import { QualityIssueList } from "./quality-issue-list";
import { QualityChart } from "./quality-chart";
import { 
  calculateQualityMetrics, 
  getQualityColor,
  checkMissingImages,
  validateProduct 
} from "@/lib/product-quality";
import type { ProductStatus } from "@/types/product";
import type { QualityIssue } from "@/types/quality";

export function QualityWidget() {
  const { products } = useProductStore();
  const [selectedStatuses, setSelectedStatuses] = useState<ProductStatus[]>([
    'active', 'development', 'inactive'
  ]);

  // Filter products based on selected statuses
  const filteredProducts = useMemo(() => {
    return products.filter(product => selectedStatuses.includes(product.basicInfo.status));
  }, [products, selectedStatuses]);

  // Calculate quality metrics for filtered products
  const qualityMetrics = useMemo(() => {
    if (filteredProducts.length === 0) {
      return {
        averageCompleteness: 0,
        completeCount: 0,
        incompleteCount: 0,
        totalMissingFields: 0,
        totalValidationErrors: 0,
        issues: [] as QualityIssue[],
      };
    }

    const metrics = filteredProducts.map(product => calculateQualityMetrics(product));
    const averageCompleteness = Math.round(
      metrics.reduce((sum, metric) => sum + metric.completenessScore, 0) / metrics.length
    );
    
    const completeCount = metrics.filter(m => m.completenessScore >= 70).length;
    const incompleteCount = filteredProducts.length - completeCount;
    
    const totalMissingFields = metrics.reduce((sum, m) => sum + m.missingFields.length, 0);
    const totalValidationErrors = metrics.reduce((sum, m) => sum + m.validationErrors.length, 0);

    // Generate quality issues
    const issues: QualityIssue[] = [];
    
    // Missing images issue
    const missingImagesCount = filteredProducts.filter(checkMissingImages).length;
    if (missingImagesCount > 0) {
      issues.push({
        issueType: 'missing-images',
        label: 'Missing Images',
        count: missingImagesCount,
        icon: XCircle,
        color: 'red',
      });
    }

    // Missing required fields issue
    const missingFieldsCount = filteredProducts.filter(p => {
      const metrics = calculateQualityMetrics(p);
      return metrics.missingFields.length > 0;
    }).length;
    if (missingFieldsCount > 0) {
      issues.push({
        issueType: 'missing-fields',
        label: 'Missing Required Fields',
        count: missingFieldsCount,
        icon: AlertTriangle,
        color: 'yellow',
      });
    }

    // Validation errors issue
    const validationErrorsCount = filteredProducts.filter(p => {
      const errors = validateProduct(p);
      return errors.length > 0;
    }).length;
    if (validationErrorsCount > 0) {
      issues.push({
        issueType: 'validation-errors',
        label: 'Validation Errors',
        count: validationErrorsCount,
        icon: XCircle,
        color: 'red',
      });
    }

    return {
      averageCompleteness,
      completeCount,
      incompleteCount,
      totalMissingFields,
      totalValidationErrors,
      issues,
    };
  }, [filteredProducts]);

  const handleStatusToggle = (status: ProductStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleIssueClick = (issueType: string) => {
    // TODO: Navigate to filtered product list
    console.log(`Navigate to products with issue: ${issueType}`);
  };

  const handleRefresh = () => {
    // TODO: Refresh quality metrics
    console.log('Refresh quality metrics');
  };

  const allStatuses: ProductStatus[] = ['active', 'development', 'inactive', 'discontinued'];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Data Quality Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor and improve product data quality
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Status:</span>
            </div>
            <div className="flex gap-2">
              {allStatuses.map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => handleStatusToggle(status)}
                  />
                  <label htmlFor={status} className="text-sm capitalize">
                    <Badge variant={selectedStatuses.includes(status) ? "default" : "outline"}>
                      {status}
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </CardHeader>
      </Card>

      {/* Quality Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QualityMetricCard
          title="Average Completeness"
          value={`${qualityMetrics.averageCompleteness}%`}
          icon={CheckCircle}
          color={getQualityColor(qualityMetrics.averageCompleteness)}
          subtitle={`${filteredProducts.length} products analyzed`}
        />
        
        <QualityMetricCard
          title="Complete Products"
          value={qualityMetrics.completeCount}
          icon={CheckCircle}
          color="green"
          subtitle={`${Math.round((qualityMetrics.completeCount / Math.max(filteredProducts.length, 1)) * 100)}% of total`}
        />
        
        <QualityMetricCard
          title="Missing Fields"
          value={qualityMetrics.totalMissingFields}
          icon={AlertTriangle}
          color={qualityMetrics.totalMissingFields > 0 ? "red" : "green"}
          subtitle="Total across all products"
        />
        
        <QualityMetricCard
          title="Validation Errors"
          value={qualityMetrics.totalValidationErrors}
          icon={XCircle}
          color={qualityMetrics.totalValidationErrors > 0 ? "red" : "green"}
          subtitle="Critical issues found"
        />
      </div>

      {/* Chart and Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Completeness Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <QualityChart
              completeCount={qualityMetrics.completeCount}
              incompleteCount={qualityMetrics.incompleteCount}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <QualityIssueList
              issues={qualityMetrics.issues}
              onIssueClick={handleIssueClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

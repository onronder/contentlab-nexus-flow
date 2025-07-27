import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, User, Tag, Bell, Check, Building, Building2, Laptop, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  StepperContainer, 
  StepperProgress, 
  StepIndicator, 
  StepConnector, 
  StepperContent, 
  StepperActions 
} from "@/components/stepper";
import { ReviewCard } from "@/components/stepper/ReviewCard";
import { useStepperState } from "@/hooks/useStepperState";
import { industries, type AddCompetitorData, initialAddCompetitorData } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface AddCompetitorStepperProps {
  onComplete: (competitorData: any) => void;
  onCancel: () => void;
}

export function AddCompetitorStepper({ onComplete, onCancel }: AddCompetitorStepperProps) {
  const stepper = useStepperState<AddCompetitorData>(initialAddCompetitorData, 4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation for each step
  useEffect(() => {
    const { name, domain } = stepper.formData;
    const isStep1Valid = name.trim().length > 0 && domain.trim().length > 0;
    stepper.setStepValidation(1, isStep1Valid);
  }, [stepper.formData.name, stepper.formData.domain]);

  useEffect(() => {
    const { industry } = stepper.formData;
    const isStep2Valid = industry.length > 0;
    stepper.setStepValidation(2, isStep2Valid);
  }, [stepper.formData.industry]);

  useEffect(() => {
    stepper.setStepValidation(3, true); // Step 3 is always valid (monitoring is optional)
  }, []);

  useEffect(() => {
    stepper.setStepValidation(4, true); // Step 4 is review, always valid
  }, []);

  // Auto-generate website URL from domain
  useEffect(() => {
    if (stepper.formData.domain) {
      const cleanDomain = stepper.formData.domain.replace(/^(https?:\/\/)/, '');
      stepper.updateFormData({ website_url: `https://${cleanDomain}` });
    }
  }, [stepper.formData.domain]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    onComplete(stepper.formData);
  };

  const marketSizeOptions = [
    { value: 'small', label: 'Small', description: '1-50 employees', icon: Building },
    { value: 'medium', label: 'Medium', description: '51-500 employees', icon: Building },
    { value: 'large', label: 'Large', description: '501-5000 employees', icon: Building2 },
    { value: 'enterprise', label: 'Enterprise', description: '5000+ employees', icon: Building2 },
  ];

  return (
    <StepperContainer>
      <StepperProgress currentStep={stepper.currentStep} totalSteps={stepper.totalSteps}>
        <StepIndicator 
          icon={User} 
          label="Basic Info" 
          isActive={stepper.currentStep === 1}
          isCompleted={stepper.currentStep > 1}
        />
        <StepConnector isCompleted={stepper.currentStep > 1} />
        <StepIndicator 
          icon={Tag} 
          label="Category" 
          isActive={stepper.currentStep === 2}
          isCompleted={stepper.currentStep > 2}
        />
        <StepConnector isCompleted={stepper.currentStep > 2} />
        <StepIndicator 
          icon={Bell} 
          label="Monitoring" 
          isActive={stepper.currentStep === 3}
          isCompleted={stepper.currentStep > 3}
        />
        <StepConnector isCompleted={stepper.currentStep > 3} />
        <StepIndicator 
          icon={Check} 
          label="Review" 
          isActive={stepper.currentStep === 4}
          isCompleted={stepper.currentStep > 4}
        />
      </StepperProgress>

      <StepperContent>
        {/* Step 1: Basic Information */}
        {stepper.currentStep === 1 && (
          <Card className="shadow-stepper">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Tell us about your competitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="form-field">
                <Label htmlFor="name">Company Name *</Label>
                <Input 
                  id="name"
                  placeholder="e.g., Apple Inc."
                  className="text-lg"
                  autoComplete="organization"
                  value={stepper.formData.name}
                  onChange={(e) => stepper.updateFormData({ name: e.target.value })}
                />
              </div>
              
              <div className="form-field">
                <Label htmlFor="domain">Domain *</Label>
                <Input 
                  id="domain"
                  placeholder="e.g., apple.com"
                  className="font-mono"
                  value={stepper.formData.domain}
                  onChange={(e) => stepper.updateFormData({ domain: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  We'll automatically generate the website URL
                </p>
              </div>
              
              <div className="form-field">
                <Label htmlFor="website_url">Website URL</Label>
                <Input 
                  id="website_url"
                  value={stepper.formData.website_url}
                  className="font-mono text-sm"
                  readOnly
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-generated from domain
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Categorization & Details */}
        {stepper.currentStep === 2 && (
          <Card className="shadow-stepper">
            <CardHeader>
              <CardTitle>Categorization</CardTitle>
              <CardDescription>
                Help us understand your competitive landscape
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="form-field">
                <Label>Industry *</Label>
                <Select 
                  value={stepper.formData.industry} 
                  onValueChange={(value) => stepper.updateFormData({ industry: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.slice(0, 5).map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        <div className="flex items-center gap-2">
                          {industry.value === 'technology' && <Laptop className="h-4 w-4 text-blue-500" />}
                          {industry.value === 'healthcare' && <Heart className="h-4 w-4 text-red-500" />}
                          {industry.value === 'financial' && <DollarSign className="h-4 w-4 text-green-500" />}
                          {industry.value === 'retail' && <Building className="h-4 w-4 text-purple-500" />}
                          {industry.value === 'manufacturing' && <Building2 className="h-4 w-4 text-orange-500" />}
                          {industry.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="form-field">
                <Label>Market Size</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {marketSizeOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={cn(
                        "p-4 cursor-pointer border-2 transition-elegant hover:shadow-elegant",
                        stepper.formData.market_size === option.value && "border-primary bg-primary/5 shadow-glow"
                      )}
                      onClick={() => stepper.updateFormData({ market_size: option.value })}
                    >
                      <div className="text-center">
                        <option.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="form-field">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description"
                  placeholder="Brief description of the competitor..."
                  maxLength={500}
                  className="min-h-[100px]"
                  value={stepper.formData.description}
                  onChange={(e) => stepper.updateFormData({ description: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {stepper.formData.description.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Monitoring Preferences */}
        {stepper.currentStep === 3 && (
          <Card className="shadow-stepper">
            <CardHeader>
              <CardTitle>Monitoring Setup</CardTitle>
              <CardDescription>
                Configure how you want to track this competitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Enable Monitoring</div>
                  <div className="text-sm text-muted-foreground">
                    Track competitor activities and receive alerts
                  </div>
                </div>
                <Switch 
                  checked={stepper.formData.monitoring_enabled}
                  onCheckedChange={(checked) => stepper.updateFormData({ monitoring_enabled: checked })}
                />
              </div>
              
              {stepper.formData.monitoring_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20 animate-fade-in">
                  <div className="form-field">
                    <Label>Alert Frequency</Label>
                    <RadioGroup 
                      value={stepper.formData.alert_frequency} 
                      onValueChange={(value) => stepper.updateFormData({ alert_frequency: value })}
                      className="grid grid-cols-3 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="cursor-pointer">
                          <div className="font-medium">Daily</div>
                          <div className="text-xs text-muted-foreground">High frequency</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly" className="cursor-pointer">
                          <div className="font-medium">Weekly</div>
                          <div className="text-xs text-muted-foreground">Recommended</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer">
                          <div className="font-medium">Monthly</div>
                          <div className="text-xs text-muted-foreground">Low frequency</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="form-field">
                    <Label>Priority Level</Label>
                    <Select 
                      value={stepper.formData.priority_level} 
                      onValueChange={(value) => stepper.updateFormData({ priority_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Low Priority</Badge>
                            <span className="text-sm text-muted-foreground">Basic tracking</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Medium Priority</Badge>
                            <span className="text-sm text-muted-foreground">Standard tracking</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">High Priority</Badge>
                            <span className="text-sm text-muted-foreground">Intensive tracking</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Confirmation */}
        {stepper.currentStep === 4 && (
          <div className="space-y-6">
            <Card className="shadow-stepper">
              <CardHeader>
                <CardTitle>Review & Confirm</CardTitle>
                <CardDescription>
                  Please review the competitor details before adding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <ReviewCard title="Basic Information" onEdit={() => stepper.goToStep(1)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span className="font-medium">{stepper.formData.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Domain:</span>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {stepper.formData.domain}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Website:</span>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {stepper.formData.website_url}
                        </code>
                      </div>
                    </div>
                  </ReviewCard>
                  
                  <ReviewCard title="Categorization" onEdit={() => stepper.goToStep(2)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Industry:</span>
                        <Badge variant="outline" className="capitalize">
                          {stepper.formData.industry}
                        </Badge>
                      </div>
                      {stepper.formData.market_size && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Market Size:</span>
                          <Badge variant="secondary" className="capitalize">
                            {stepper.formData.market_size}
                          </Badge>
                        </div>
                      )}
                      {stepper.formData.description && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Description:</span>
                          <p className="text-sm bg-muted p-3 rounded">
                            {stepper.formData.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </ReviewCard>
                  
                  <ReviewCard title="Monitoring Settings" onEdit={() => stepper.goToStep(3)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={stepper.formData.monitoring_enabled ? "default" : "secondary"}>
                          {stepper.formData.monitoring_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      {stepper.formData.monitoring_enabled && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Frequency:</span>
                            <span className="capitalize font-medium">{stepper.formData.alert_frequency}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Priority:</span>
                            <Badge 
                              variant={
                                stepper.formData.priority_level === 'high' ? 'destructive' : 
                                stepper.formData.priority_level === 'medium' ? 'default' : 'secondary'
                              }
                              className="capitalize"
                            >
                              {stepper.formData.priority_level}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </ReviewCard>
                </div>
                
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Once added, this competitor will appear in your dashboard and you can start tracking their activities.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}
      </StepperContent>

      <StepperActions>
        <Button 
          variant="ghost" 
          onClick={stepper.currentStep === 1 ? onCancel : stepper.prevStep}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {stepper.currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        <Button 
          onClick={stepper.currentStep === 4 ? handleSubmit : stepper.nextStep}
          disabled={!stepper.isCurrentStepValid || isSubmitting}
          variant={stepper.currentStep === 4 ? "hero" : "default"}
        >
          {isSubmitting ? (
            "Adding..."
          ) : stepper.currentStep === 4 ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Add Competitor
            </>
          ) : (
            <>
              Next: {
                stepper.currentStep === 1 ? "Category" :
                stepper.currentStep === 2 ? "Monitoring" :
                "Review"
              }
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </StepperActions>
    </StepperContainer>
  );
}
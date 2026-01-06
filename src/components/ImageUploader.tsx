import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageSelect: (imageData: string) => void;
  isLoading: boolean;
}

export const ImageUploader = ({ onImageSelect, isLoading }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageSelect(result);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clearImage = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="w-full">
      {!preview ? (
        <label
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-64 md:h-80 rounded-2xl cursor-pointer transition-all duration-300",
            "border-2 border-dashed",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50",
            isLoading && "pointer-events-none opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className={cn(
              "p-4 rounded-full transition-all duration-300",
              isDragging ? "bg-primary/20" : "bg-secondary"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                {isDragging ? "Drop your image here" : "Upload road image"}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70">
                Supports JPG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>

          {/* Animated border effect */}
          <div className={cn(
            "absolute inset-0 rounded-2xl pointer-events-none opacity-0 transition-opacity",
            isDragging && "opacity-100"
          )}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 animate-pulse" />
          </div>
        </label>
      ) : (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <img
              src={preview}
              alt="Road preview"
              className="w-full h-64 md:h-80 object-cover"
            />
            
            {/* Overlay */}
            <div className={cn(
              "absolute inset-0 bg-background/80 flex items-center justify-center transition-opacity",
              isLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Analyzing road damage...</p>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearImage}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>

            {/* Scanning effect when loading */}
            {isLoading && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
              </div>
            )}
          </div>

          {/* Image info */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span>Image ready for analysis</span>
          </div>
        </div>
      )}
    </div>
  );
};

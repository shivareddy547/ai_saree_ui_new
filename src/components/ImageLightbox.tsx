
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
} from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onImageChange?: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onImageChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
  });

  const [startPosition, setStartPosition] = useState({
    x: 0,
    y: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset lightbox state every time it opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(currentIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);

      document.body.style.overflow = "hidden";

      // Focus lightbox for keyboard controls
      setTimeout(() => {
        containerRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentIndex]);

  // Notify parent when active image changes
  useEffect(() => {
    if (isOpen && onImageChange) {
      onImageChange(activeIndex);
    }
  }, [activeIndex, isOpen, onImageChange]);

  // Reset transform when image changes
  const resetImageTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleClose = () => {
    resetImageTransform();
    setActiveIndex(currentIndex);
    onClose();
  };

  const handlePrevious = () => {
    if (activeIndex <= 0) return;

    setActiveIndex((prev) => prev - 1);
    resetImageTransform();
  };

  const handleNext = () => {
    if (activeIndex >= images.length - 1) return;

    setActiveIndex((prev) => prev + 1);
    resetImageTransform();
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.25, 0.5);

      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
      }

      return newScale;
    });
  };

  const handleDownload = () => {
    const imageUrl = images[activeIndex];

    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `image-${activeIndex + 1}.jpg`;
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -----------------------------
  // Mouse drag handlers
  // -----------------------------

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (scale <= 1) return;

    e.preventDefault();

    setIsDragging(true);

    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });

    setStartPosition({
      ...position,
    });
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isDragging || scale <= 1) return;

    e.preventDefault();

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPosition({
      x: startPosition.x + deltaX,
      y: startPosition.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // -----------------------------
  // Touch drag handlers
  // -----------------------------

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    if (scale <= 1 || e.touches.length !== 1) return;

    const touch = e.touches[0];

    setIsDragging(true);

    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
    });

    setStartPosition({
      ...position,
    });
  };

  const handleTouchMove = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    if (
      !isDragging ||
      scale <= 1 ||
      e.touches.length !== 1
    ) {
      return;
    }

    e.preventDefault();

    const touch = e.touches[0];

    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;

    setPosition({
      x: startPosition.x + deltaX,
      y: startPosition.y + deltaY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // -----------------------------
  // Keyboard controls
  // -----------------------------

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!isOpen) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        handleClose();
        break;

      case "ArrowLeft":
        e.preventDefault();
        handlePrevious();
        break;

      case "ArrowRight":
        e.preventDefault();
        handleNext();
        break;

      case "+":
      case "=":
        e.preventDefault();
        handleZoomIn();
        break;

      case "-":
        e.preventDefault();
        handleZoomOut();
        break;

      default:
        break;
    }
  };

  if (!isOpen || images.length === 0) {
    return null;
  }

  const activeImage = images[activeIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      tabIndex={0}
    >
      {/* -------------------------------- */}
      {/* Close button */}
      {/* -------------------------------- */}

      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Close viewer"
      >
        <X size={24} />
      </button>

      {/* -------------------------------- */}
      {/* Image counter */}
      {/* -------------------------------- */}

      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* -------------------------------- */}
      {/* Previous button */}
      {/* -------------------------------- */}

      {images.length > 1 && activeIndex > 0 && (
        <button
          type="button"
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* -------------------------------- */}
      {/* Next button */}
      {/* -------------------------------- */}

      {images.length > 1 &&
        activeIndex < images.length - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight size={28} />
          </button>
        )}

      {/* -------------------------------- */}
      {/* Image area */}
      {/* -------------------------------- */}

      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction:
            scale > 1 ? "none" : "auto",
        }}
      >
        <img
          key={activeImage}
          ref={imageRef}
          src={activeImage}
          alt={`Image ${activeIndex + 1}`}
          className="max-h-[90vh] max-w-[95vw] object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            cursor:
              scale > 1
                ? isDragging
                  ? "grabbing"
                  : "grab"
                : "default",
            transition: isDragging
              ? "none"
              : "transform 0.15s ease-out",
            willChange:
              "transform",
          }}
          draggable={false}
          onLoad={() => {
            // Always reset image position when a new image
            // is loaded. This prevents the second-open
            // overlap/position issue.
            setScale(1);
            setPosition({
              x: 0,
              y: 0,
            });
            setIsDragging(false);
          }}
          onError={(e) => {
            const target =
              e.target as HTMLImageElement;

            if (
              target.src !==
              "/placeholder-image.jpg"
            ) {
              target.src =
                "/placeholder-image.jpg";
            }
          }}
        />
      </div>

      {/* -------------------------------- */}
      {/* Bottom controls */}
      {/* -------------------------------- */}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          aria-label="Zoom out"
          disabled={scale <= 0.5}
        >
          <ZoomOut size={20} />
        </button>

        <span className="text-white text-sm font-medium min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          aria-label="Zoom in"
          disabled={scale >= 3}
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-white/20" />

        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors"
          aria-label="Download image"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
};

export default ImageLightbox;



import React, {
  useState,
  useEffect,
  useRef,
} from "react";
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

const ImageLightbox: React.FC<
  ImageLightboxProps
> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onImageChange,
}) => {
  const [activeIndex, setActiveIndex] =
    useState(currentIndex);

  const [scale, setScale] =
    useState(1);

  const [position, setPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState(false);

  const [dragStart, setDragStart] =
    useState({
      x: 0,
      y: 0,
    });

  const [startPosition, setStartPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const containerRef =
    useRef<HTMLDivElement>(null);

  /*
   * ------------------------------------------------
   * Sync active index when lightbox opens.
   *
   * IMPORTANT:
   * Only depends on primitive values.
   * No callback dependency.
   * ------------------------------------------------
   */
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow =
        "";
      return;
    }

    const safeIndex =
      images.length > 0
        ? Math.min(
            Math.max(
              currentIndex,
              0
            ),
            images.length - 1
          )
        : 0;

    setActiveIndex(
      safeIndex
    );

    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsDragging(false);

    setDragStart({
      x: 0,
      y: 0,
    });

    setStartPosition({
      x: 0,
      y: 0,
    });

    document.body.style.overflow =
      "hidden";

    const timer =
      window.setTimeout(() => {
        containerRef.current?.focus();
      }, 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow =
        "";
    };
  }, [
    isOpen,
    currentIndex,
  ]);

  /*
   * ------------------------------------------------
   * Reset zoom and position when active image changes.
   *
   * IMPORTANT:
   * Only activeIndex is used here.
   * This prevents dependency loops.
   * ------------------------------------------------
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsDragging(false);

    setDragStart({
      x: 0,
      y: 0,
    });

    setStartPosition({
      x: 0,
      y: 0,
    });
  }, [
    activeIndex,
    isOpen,
  ]);

  /*
   * ------------------------------------------------
   * Keyboard controls
   * ------------------------------------------------
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyboard =
      (event: KeyboardEvent) => {
        switch (event.key) {
          case "Escape":
            event.preventDefault();
            onClose();
            break;

          case "ArrowLeft":
            event.preventDefault();

            setActiveIndex(
              (previousIndex) => {
                if (
                  previousIndex <=
                  0
                ) {
                  return previousIndex;
                }

                const newIndex =
                  previousIndex - 1;

                onImageChange?.(
                  newIndex
                );

                return newIndex;
              }
            );

            break;

          case "ArrowRight":
            event.preventDefault();

            setActiveIndex(
              (previousIndex) => {
                if (
                  previousIndex >=
                  images.length - 1
                ) {
                  return previousIndex;
                }

                const newIndex =
                  previousIndex + 1;

                onImageChange?.(
                  newIndex
                );

                return newIndex;
              }
            );

            break;

          case "+":
          case "=":
            event.preventDefault();

            setScale(
              (previousScale) =>
                Math.min(
                  previousScale +
                    0.25,
                  3
                )
            );

            break;

          case "-":
            event.preventDefault();

            setScale(
              (previousScale) => {
                const newScale =
                  Math.max(
                    previousScale -
                      0.25,
                    0.5
                  );

                if (
                  newScale <= 1
                ) {
                  setPosition({
                    x: 0,
                    y: 0,
                  });
                }

                return newScale;
              }
            );

            break;

          default:
            break;
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    isOpen,
    images.length,
    onClose,
    onImageChange,
  ]);

  /*
   * ------------------------------------------------
   * Close
   * ------------------------------------------------
   */
  const handleClose = () => {
    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsDragging(false);

    onClose();
  };

  /*
   * ------------------------------------------------
   * Previous image
   * ------------------------------------------------
   */
  const handlePrevious = () => {
    if (
      images.length <= 1
    ) {
      return;
    }

    if (
      activeIndex <= 0
    ) {
      return;
    }

    const newIndex =
      activeIndex - 1;

    /*
     * Reset BEFORE switching image.
     */
    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsDragging(false);

    setActiveIndex(
      newIndex
    );

    onImageChange?.(
      newIndex
    );
  };

  /*
   * ------------------------------------------------
   * Next image
   * ------------------------------------------------
   */
  const handleNext = () => {
    if (
      images.length <= 1
    ) {
      return;
    }

    if (
      activeIndex >=
      images.length - 1
    ) {
      return;
    }

    const newIndex =
      activeIndex + 1;

    /*
     * Reset BEFORE switching image.
     */
    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsDragging(false);

    setActiveIndex(
      newIndex
    );

    onImageChange?.(
      newIndex
    );
  };

  /*
   * ------------------------------------------------
   * Zoom in
   * ------------------------------------------------
   */
  const handleZoomIn = () => {
    setScale(
      (previousScale) =>
        Math.min(
          previousScale +
            0.25,
          3
        )
    );
  };

  /*
   * ------------------------------------------------
   * Zoom out
   * ------------------------------------------------
   */
  const handleZoomOut = () => {
    setScale(
      (previousScale) => {
        const newScale =
          Math.max(
            previousScale -
              0.25,
            0.5
          );

        if (
          newScale <= 1
        ) {
          setPosition({
            x: 0,
            y: 0,
          });

          setIsDragging(false);
        }

        return newScale;
      }
    );
  };

  /*
   * ------------------------------------------------
   * Download
   * ------------------------------------------------
   */
  const handleDownload =
    async () => {
      const imageUrl =
        images[activeIndex];

      if (!imageUrl) {
        return;
      }

      try {
        const response =
          await fetch(
            imageUrl
          );

        const blob =
          await response.blob();

        const blobUrl =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          blobUrl;

        link.download =
          `image-${
            activeIndex + 1
          }.jpg`;

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

        window.URL.revokeObjectURL(
          blobUrl
        );
      } catch (error) {
        console.error(
          "Image download failed:",
          error
        );

        window.open(
          imageUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
    };

  /*
   * ------------------------------------------------
   * Mouse drag
   * ------------------------------------------------
   */
  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      scale <= 1
    ) {
      return;
    }

    event.preventDefault();

    setIsDragging(true);

    setDragStart({
      x: event.clientX,
      y: event.clientY,
    });

    setStartPosition({
      x: position.x,
      y: position.y,
    });
  };

  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      !isDragging ||
      scale <= 1
    ) {
      return;
    }

    event.preventDefault();

    const deltaX =
      event.clientX -
      dragStart.x;

    const deltaY =
      event.clientY -
      dragStart.y;

    setPosition({
      x:
        startPosition.x +
        deltaX,
      y:
        startPosition.y +
        deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /*
   * ------------------------------------------------
   * Touch drag
   * ------------------------------------------------
   */
  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (
      scale <= 1 ||
      event.touches.length !== 1
    ) {
      return;
    }

    const touch =
      event.touches[0];

    setIsDragging(true);

    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
    });

    setStartPosition({
      x: position.x,
      y: position.y,
    });
  };

  const handleTouchMove = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (
      !isDragging ||
      scale <= 1 ||
      event.touches.length !== 1
    ) {
      return;
    }

    event.preventDefault();

    const touch =
      event.touches[0];

    const deltaX =
      touch.clientX -
      dragStart.x;

    const deltaY =
      touch.clientY -
      dragStart.y;

    setPosition({
      x:
        startPosition.x +
        deltaX,
      y:
        startPosition.y +
        deltaY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  /*
   * ------------------------------------------------
   * Render
   * ------------------------------------------------
   */
  if (
    !isOpen ||
    images.length === 0
  ) {
    return null;
  }

  const activeImage =
    images[activeIndex];

  if (!activeImage) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      tabIndex={0}
      onClick={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={
          handleClose
        }
        className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Close viewer"
      >
        <X size={24} />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
          {activeIndex + 1} /{" "}
          {images.length}
        </div>
      )}

      {/* Previous */}
      {images.length > 1 &&
        activeIndex > 0 && (
          <button
            type="button"
            onClick={
              handlePrevious
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft
              size={28}
            />
          </button>
        )}

      {/* Next */}
      {images.length > 1 &&
        activeIndex <
          images.length - 1 && (
          <button
            type="button"
            onClick={
              handleNext
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight
              size={28}
            />
          </button>
        )}

      {/* Image */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden"
        onMouseDown={
          handleMouseDown
        }
        onMouseMove={
          handleMouseMove
        }
        onMouseUp={
          handleMouseUp
        }
        onMouseLeave={
          handleMouseUp
        }
        onTouchStart={
          handleTouchStart
        }
        onTouchMove={
          handleTouchMove
        }
        onTouchEnd={
          handleTouchEnd
        }
        style={{
          touchAction:
            scale > 1
              ? "none"
              : "auto",
        }}
      >
        <img
          /*
           * This forces React to remove
           * the previous image DOM element
           * and create a completely new one.
           */
          key={`${activeIndex}-${activeImage}`}
          src={activeImage}
          alt={`Image ${
            activeIndex + 1
          }`}
          className="block max-h-[90vh] max-w-[95vw] w-auto h-auto object-contain select-none"
          draggable={false}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transformOrigin:
              "center center",
            cursor:
              scale > 1
                ? isDragging
                  ? "grabbing"
                  : "grab"
                : "default",
            transition:
              isDragging
                ? "none"
                : "transform 0.15s ease-out",
            willChange:
              "transform",
          }}
          onError={(event) => {
            const target =
              event.currentTarget;

            if (
              !target.src.includes(
                "placeholder-image.jpg"
              )
            ) {
              target.src =
                "/placeholder-image.jpg";
            }
          }}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
        <button
          type="button"
          onClick={
            handleZoomOut
          }
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          aria-label="Zoom out"
          disabled={
            scale <= 0.5
          }
        >
          <ZoomOut size={20} />
        </button>

        <span className="text-white text-sm font-medium min-w-[40px] text-center">
          {Math.round(
            scale * 100
          )}
          %
        </span>

        <button
          type="button"
          onClick={
            handleZoomIn
          }
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          aria-label="Zoom in"
          disabled={
            scale >= 3
          }
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-white/20" />

        <button
          type="button"
          onClick={
            handleDownload
          }
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


import {
  addClass,
  contain,
  get360ViewProps,
  getResponsiveWidthOfContainer,
  getSizeAccordingToPixelRatio,
  magnify,
  pad,
  removeClass,
  set360ViewCircleIconStyles,
  set360ViewIconStyles,
  setBoxShadowStyles,
  setCloseFullScreenViewStyles,
  setFullScreenIconStyles,
  setFullScreenModalStyles,
  setLoaderStyles,
  setMagnifyIconStyles,
  setView360Icon
} from './ci360.utils';


class CI360Viewer {
  constructor(container, fullScreen, ratio) {
    this.container = container;
    this.activeImage = 1;
    this.movementStart = 0;
    this.isClicked = false;
    this.loadedImages = 0;
    this.imagesLoaded = false;
    this.reversed = false;
    this.fullScreenView = !!fullScreen;
    this.ratio = ratio;
    this.images = [];
    this.devicePixelRatio = Math.round(window.devicePixelRatio || 1);
    this.isMobile = !!('ontouchstart' in window || navigator.msMaxTouchPoints);
    this.id = container.id;
    this.init(container);
  }

  /**
   * Track a custom link event in Adobe Analytics
   * @param {String} customEvent The type of event that is happening (e.g., profile:previous:click)
   */
  trackanalytics(customEvent) {
    const device = this.isMobile ? 'mobile:' : 'desktop:';

    if ( window.espn && window.espn.track ) {
      window.espn.track.trackLink( {
        linkPos: `espncom:nba-figs:${device}${customEvent}`,
        linkId: null
      } );
    }
  }

  mousedown(event) {
    event.preventDefault();

    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      // this.autoplay = false;
    }

    this.movementStart = event.pageX;
    this.isClicked = true;
    this.container.style.cursor = 'grabbing';
  }

  setautoplaytimer() {
    window.setTimeout( () => {
      this.isAutoplayCountingDown = false;

      if ( this.autoplay && ! this.isClicked ) {
        this.isPlaying = true;
        this.instructions.classList.remove( 'is-hidden' );
        // TODO FIXME This needs to be cleared and reset each time, not just left to complete as a timeout
        // The call also triggers for each and every rotation that's loaded, not just for this specific player
        // currently, which is skewing data dramatically
        this.trackanalytics( `${this.playerName}:rotation:end` );
      }
    }, 2000 );
  }

  mouseup() {
    if (!this.imagesLoaded) return;

    this.movementStart = 0;
    this.isClicked = false;
    this.container.style.cursor = 'grab';

    if (this.bottomCircle) {
      this.show360ViewCircleIcon();
    }

    if ( ! this.isAutoplayCountingDown ) {
      this.isAutoplayCountingDown = true;
      this.autoplay = true;
      this.setautoplaytimer();
    }
  }

  mousemove(event) {
    if (!this.isClicked || !this.imagesLoaded) return;
    this.instructions.classList.add( 'is-hidden' );

    this.onMove(event.pageX);
  }

  touchstart(event) {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      // this.autoplay = false;
    }

    this.movementStart = event.touches[0].clientX;
    this.isClicked = true;
  }

  touchend() {
    if (!this.imagesLoaded) return;

    this.movementStart = 0;
    this.isClicked = false;

    if (this.bottomCircle) this.show360ViewCircleIcon();

    if ( ! this.isAutoplayCountingDown ) {
      this.isAutoplayCountingDown = true;
      this.setautoplaytimer();
    }
  }

  touchmove(event) {
    if (!this.isClicked || !this.imagesLoaded) return;
    this.instructions.classList.add( 'is-hidden' );

    this.onMove(event.touches[0].clientX);
  }

  keydownGeneral() {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }
  }

  keydown(event) {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if ([37, 39].includes(event.keyCode)) {
      if (37 === event.keyCode) {
        if (this.reversed)
          this.prev();
        else
          this.next();
      } else if (39 === event.keyCode) {
        if (this.reversed)
          this.next();
        else
          this.prev();
      }

      this.onSpin();
    }
  }

  onSpin() {
    if (this.bottomCircle) {
      this.hide360ViewCircleIcon();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      // this.autoplay = false;
    }
  }

  keyup(event) {
    if (!this.imagesLoaded) return;

    if ([37, 39].includes(event.keyCode)) {
      this.onFinishSpin();
    }
  }

  onFinishSpin() {
    if (this.bottomCircle) this.show360ViewCircleIcon();
  }

  onMove(pageX) {
    if (pageX - this.movementStart >= this.speedFactor) {
      let itemsSkippedRight = Math.floor((pageX - this.movementStart) / this.speedFactor) || 1;

      this.movementStart = pageX;

      if (this.spinReverse) {
        this.moveActiveIndexDown(itemsSkippedRight);
      } else {
        this.moveActiveIndexUp(itemsSkippedRight);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
      this.update();
    } else if (this.movementStart - pageX >= this.speedFactor) {
      let itemsSkippedLeft = Math.floor((this.movementStart - pageX) / this.speedFactor) || 1;

      this.movementStart = pageX;

      if (this.spinReverse) {
        this.moveActiveIndexUp(itemsSkippedLeft);
      } else {
        this.moveActiveIndexDown(itemsSkippedLeft);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
      this.update();
    }
  }

  moveActiveIndexUp(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdges) {
      if (this.activeImage + itemsSkipped >= this.amount) {
        this.activeImage = this.amount;

        if (isReverse ? this.prevElem : this.nextElem) {
          addClass(isReverse ? this.prevElem : this.nextElem, 'not-active');
        }
      } else {
        this.activeImage += itemsSkipped;

        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
      }
    } else {
      this.activeImage = (this.activeImage + itemsSkipped) % this.amount || this.amount;
    }
  }

  moveActiveIndexDown(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdges) {
      if (this.activeImage - itemsSkipped <= 1) {
        this.activeImage = 1;

        if (isReverse ? this.nextElem : this.prevElem) {
          addClass(isReverse ? this.nextElem : this.prevElem, 'not-active');
        }
      } else {
        this.activeImage -= itemsSkipped;

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }
      }
    } else {
      if (this.activeImage - itemsSkipped < 1) {
        this.activeImage = this.amount + (this.activeImage - itemsSkipped);
      } else {
        this.activeImage -= itemsSkipped;
      }
    }
  }

  loop(reversed) {
    if ( ! this.isPlaying ) {
      return;
    }
    reversed ? this.prev() : this.next();
  }

  next() {
    this.moveActiveIndexUp(1);
    this.update();
  }

  prev() {
    this.moveActiveIndexDown(1);
    this.update();
  }

  update() {
    const image = this.images[this.activeImage - 1];
    const ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true } );

    ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

    if (this.fullScreenView) {
      this.canvas.width = window.innerWidth * this.devicePixelRatio;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.height = window.innerHeight * this.devicePixelRatio;
      this.canvas.style.height = window.innerHeight + 'px';

      const { offsetX, offsetY, width, height } =
        contain(this.canvas.width, this.canvas.height, image.width, image.height);

      ctx.drawImage(image, offsetX, offsetY, width, height);
    } else {
      this.canvas.width = this.container.offsetWidth * this.devicePixelRatio;
      this.canvas.style.width = this.container.offsetWidth + 'px';
      this.canvas.height = this.container.offsetWidth * this.devicePixelRatio / image.width * image.height;
      this.canvas.style.height = this.container.offsetWidth / image.width * image.height + 'px';

      ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // updatePercentageInLoader(percentage) {
  //   if (this.loader) {
  //     this.loader.style.width = percentage + '%';
  //   }

  //   if (this.view360Icon) {
  //     this.view360Icon.innerText = percentage + '%';
  //   }
  // }

  onAllImagesLoaded() {
    this.imagesLoaded = true;
    this.container.style.cursor = 'grab';
    // this.removeLoader();

    if (!this.fullScreenView) {
      this.speedFactor = Math.floor(this.dragSpeed / 150 * 36 / this.amount * 25 * this.container.offsetWidth / 1500) || 1;
    } else {
      const containerRatio = this.container.offsetHeight / this.container.offsetWidth;
      let imageOffsetWidth = this.container.offsetWidth;

      if (this.ratio > containerRatio) {
        imageOffsetWidth = this.container.offsetHeight / this.ratio;
      }

      this.speedFactor = Math.floor(this.dragSpeed / 150 * 36 / this.amount * 25 * imageOffsetWidth / 1500) || 1;
    }

    this.frame.classList.add( 'is-active' );

    if (this.autoplay) {
      this.isPlaying = false;
      this.frame.dataset.hasLoaded = 'true';
      this.play();
    }

    if (this.view360Icon) {
      this.view360Icon.innerText = '';
      setView360Icon(this.view360Icon);
    }

    this.initControls();

    this.trackanalytics( `${this.playerName}:figurine-loaded` );
  }

  onFirstImageLoaded(event) {
    // this.add360ViewIcon();

    if (this.fullScreenView) {
      this.canvas.width = window.innerWidth * this.devicePixelRatio;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.height = window.innerHeight * this.devicePixelRatio;
      this.canvas.style.height = window.innerHeight + 'px';

      const ctx = this.canvas.getContext("2d");

      const { offsetX, offsetY, width, height } =
        contain(this.canvas.width, this.canvas.height, event.target.width, event.target.height);

      ctx.drawImage(event.target, offsetX, offsetY, width, height);
    } else {
      this.canvas.width = this.container.offsetWidth * this.devicePixelRatio;
      this.canvas.style.width = this.container.offsetWidth + 'px';
      this.canvas.height = this.container.offsetWidth * this.devicePixelRatio / event.target.width * event.target.height;
      this.canvas.style.height = this.container.offsetWidth / event.target.width * event.target.height + 'px';

      const ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true } );

      ctx.drawImage(event.target, 0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.lazyload && !this.fullScreenView) {
      this.images
        .forEach((image, index) => {
          if (index === 0) {
            this.innerBox.removeChild(this.lazyloadInitImage);
            return;
          }

          const dataSrc = image.getAttribute('data-src');

          if (dataSrc) {
            image.src = image.getAttribute('data-src');
          }
        });
    }

    if (this.ratio) {
      this.container.style.minHeight = 'auto';
    }

    if (this.magnifier && !this.fullScreenView) {
      this.addMagnifier();
    }

    if (this.boxShadow && !this.fullScreenView) {
      this.addBoxShadow();
    }

    if (this.bottomCircle && !this.fullScreenView) {
      this.add360ViewCircleIcon();
    }

    if (this.fullScreen && !this.fullScreenView) {
      this.addFullScreenIcon();
    } else if (this.fullScreenView) {
      this.addCloseFullScreenView();
    }
  }

  onImageLoad(event) {
    // const percentage = Math.round(this.loadedImages / this.amount * 100);

    this.loadedImages += 1;
    // this.updatePercentageInLoader(percentage);

    if (this.loadedImages === this.amount) {
      this.onAllImagesLoaded(event);
    } else if (this.loadedImages === 1) {
      this.onFirstImageLoaded(event);
    }
  }

  addCloseFullScreenView() {
    const closeFullScreenIcon = document.createElement('div');

    setCloseFullScreenViewStyles(closeFullScreenIcon);

    closeFullScreenIcon.onclick = this.closeFullScreenModal.bind(this);

    this.innerBox.appendChild(closeFullScreenIcon);
  }

  // add360ViewIcon() {
  //   const view360Icon = document.createElement('div');

  //   set360ViewIconStyles(view360Icon);

  //   view360Icon.innerText = '0%';

  //   this.view360Icon = view360Icon;
  //   this.innerBox.appendChild(view360Icon);
  // }

  addFullScreenIcon() {
    const fullScreenIcon = document.createElement('div');

    setFullScreenIconStyles(fullScreenIcon);

    fullScreenIcon.onclick = this.openFullScreenModal.bind(this);

    this.innerBox.appendChild(fullScreenIcon);
  }

  addMagnifier() {
    const magnifyIcon = document.createElement('div');

    setMagnifyIconStyles(magnifyIcon, this.fullScreen);

    magnifyIcon.onclick = this.magnify.bind(this);

    this.innerBox.appendChild(magnifyIcon);
  }

  getOriginalSrc() {
    const currentImage = this.images[this.activeImage - 1];
    const lastIndex = currentImage.src.lastIndexOf('//');

    return lastIndex > 10 ? currentImage.src.slice(lastIndex) : currentImage.src;
  }

  magnify() {
    const image = new Image();
    const src = this.getOriginalSrc();

    image.src = src;
    image.onload = () => {
      if (this.glass) {
        this.glass.style.cursor = 'none';
      }
    };

    this.glass = document.createElement('div');
    this.container.style.overflow = 'hidden';
    magnify(this.container, src, this.glass, this.magnifier || 3);
  }

  closeMagnifier() {
    if (!this.glass) return;

    this.container.style.overflow = 'visible';
    this.container.removeChild(this.glass);
    this.glass = null;
  }

  openFullScreenModal() {
    const fullScreenModal = document.createElement('div');

    setFullScreenModalStyles(fullScreenModal);

    const fullScreenContainer = this.container.cloneNode();
    const image = this.images[0];
    const ratio = image.height / image.width;

    fullScreenContainer.style.height = '100%';
    fullScreenContainer.style.maxHeight = '100%';

    fullScreenModal.appendChild(fullScreenContainer);

    window.document.body.appendChild(fullScreenModal);

    new CI360Viewer(fullScreenContainer, true, ratio);
  }

  closeFullScreenModal() {
    document.body.removeChild(this.container.parentNode);
  }

  add360ViewCircleIcon() {
    const view360CircleIcon = new Image();

    set360ViewCircleIconStyles(view360CircleIcon, this.bottomCircleOffset);

    this.view360CircleIcon = view360CircleIcon;
    this.innerBox.appendChild(view360CircleIcon);
  }

  hide360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.view360CircleIcon.style.opacity = '0';
  }

  show360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.view360CircleIcon.style.opacity = '1';
  }

  remove360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.innerBox.removeChild(this.view360CircleIcon);
    this.view360CircleIcon = null;
  }

  addLoader() {
    const loader = document.createElement('div');

    setLoaderStyles(loader);

    this.loader = loader;
    this.innerBox.appendChild(loader);
  }

  addBoxShadow() {
    const boxShadow = document.createElement('div');

    setBoxShadowStyles(boxShadow, this.boxShadow);

    this.innerBox.appendChild(boxShadow);
  }

  removeLoader() {
    if (!this.loader) return;

    this.innerBox.removeChild(this.loader);
    this.loader = null;
  }

  remove360ViewIcon() {
    if (!this.view360Icon) return;

    this.innerBox.removeChild(this.view360Icon);
    this.view360Icon = null;
  }

  play() {
    if (this.bottomCircle) this.hide360ViewCircleIcon();
    this.remove360ViewIcon();

    if ( this.isPlaying ) {
      return;
    } else {
      this.isPlaying = true;
    }

    this.loopTimeoutId = window.setInterval(() => {
      this.loop(this.reversed);
    }, this.autoplaySpeed);
  }

  stop() {
    if (this.bottomCircle) this.show360ViewCircleIcon();
    // window.clearInterval(this.loopTimeoutId);
    this.isPlaying = false;
  }

  getSrc(responsive, container, folder, filename, { ciSize, ciToken, ciOperation, ciFilters }) {
    let src = `${folder}${filename}`;

    if (responsive) {
      let imageOffsetWidth = container.offsetWidth;

      if (this.fullScreenView) {
        const containerRatio = container.offsetHeight / container.offsetWidth;

        if (this.ratio > containerRatio) {
          imageOffsetWidth = container.offsetHeight / this.ratio;
        }
      }

      const ciSizeNext = getSizeAccordingToPixelRatio(ciSize || getResponsiveWidthOfContainer(imageOffsetWidth));

      src = `https://${ciToken}.cloudimg.io/${ciOperation}/${ciSizeNext}/${ciFilters}/${src}`;
    }

    return src;
  }

  preloadImages(amount, src, lazyload, lazySelector, container, responsive, ciParams) {
    if (this.imageList) {
      try {
        const images = JSON.parse(this.imageList);

        this.amount = images.length;
        images.forEach(src => {
          const folder = /(http(s?)):\/\//gi.test(src) ? '' : this.folder;
          const resultSrc = this.getSrc(responsive, container, folder, src, ciParams);

          this.addImage(resultSrc, lazyload, lazySelector);
        });
      } catch (error) {
        console.error(`Wrong format in image-list attribute: ${error.message}`);
      }
    } else {
      [...new Array(amount)].map((_item, index) => {
        const nextZeroFilledIndex = pad(index + 1, this.indexZeroBase);
        const resultSrc = src.replace('{index}', nextZeroFilledIndex);
        this.addImage(resultSrc, lazyload, lazySelector, index);
      });
    }
  }

  addImage(resultSrc, lazyload, lazySelector, index) {
    const image = new Image();

    if (lazyload && !this.fullScreenView) {
      image.setAttribute('data-src', resultSrc);
      image.className = image.className.length ? image.className + ` ${lazySelector}` : lazySelector;

      if (index === 0) {
        this.lazyloadInitImage = image;
        image.style.position = 'absolute';
        image.style.top = '0';
        image.style.left = '0';
        this.innerBox.appendChild(image);
      }
    } else {
      image.src = resultSrc;
    }

    image.onload = this.onImageLoad.bind(this);
    image.onerror = this.onImageLoad.bind(this);
    this.images.push(image);
  }

  destroy() {
    stop();

    const oldElement = this.container;
    const newElement = oldElement.cloneNode(true);
    const innerBox = newElement.querySelector('.cloudimage-inner-box');

    newElement.className = newElement.className.replace(' initialized', '');
    newElement.style.position = 'relative';
    newElement.style.width = '100%';
    newElement.style.cursor = 'default';
    newElement.setAttribute('draggable', 'false');
    newElement.style.minHeight = 'auto';
    newElement.removeChild(innerBox);
    oldElement.parentNode.replaceChild(newElement, oldElement);
  }

  initControls() {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;
    const prev = this.container.querySelector('.cloudimage-360-prev');
    const next = this.container.querySelector('.cloudimage-360-next');

    if (!prev && !next) return;

    const onLeftStart = (event) => {
      event.stopPropagation();
      this.onSpin();
      this.prev();
      this.loopTimeoutId = window.setInterval(this.prev.bind(this), this.autoplaySpeed);
    };
    const onRightStart = (event) => {
      event.stopPropagation();
      this.onSpin();
      this.next();
      this.loopTimeoutId = window.setInterval(this.next.bind(this), this.autoplaySpeed);
    };
    const onLeftEnd = () => {
      this.onFinishSpin();
      window.clearInterval(this.loopTimeoutId);
    };
    const onRightEnd = () => {
      this.onFinishSpin();
      window.clearInterval(this.loopTimeoutId);
    };

    if (prev) {
      prev.style.display = 'block';
      prev.addEventListener('mousedown', isReverse ? onRightStart : onLeftStart);
      prev.addEventListener('touchstart', isReverse ? onRightStart : onLeftStart);
      prev.addEventListener('mouseup', isReverse ? onRightEnd : onLeftEnd);
      prev.addEventListener('touchend', isReverse ? onRightEnd : onLeftEnd);

      this.prevElem = prev;
    }

    if (next) {
      next.style.display = 'block';
      next.addEventListener('mousedown', isReverse ? onLeftStart : onRightStart);
      next.addEventListener('touchstart', isReverse ? onLeftStart : onRightStart);
      next.addEventListener('mouseup', isReverse ? onLeftEnd : onRightEnd);
      next.addEventListener('touchend', isReverse ? onLeftEnd : onRightEnd);

      this.nextElem = next;
    }

    if (isReverse ? next : prev) {
      if (this.stopAtEdges) {
        addClass(isReverse ? next : prev, 'not-active');
      }
    }
  }

  addInnerBox() {
    this.innerBox = document.createElement('div');
    this.innerBox.className = 'cloudimage-inner-box';
    this.container.appendChild(this.innerBox);
  }

  addCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.fontSize = '0';

    if (this.ratio) {
      this.container.style.minHeight = this.container.offsetWidth * this.ratio + 'px';
      this.canvas.height = parseInt(this.container.style.minHeight);
    }

    this.innerBox.appendChild(this.canvas);
  }

  attachEvents(draggable, swipeable) {
    if (draggable) {
      this.container.addEventListener('mousedown', this.mousedown.bind(this));
      document.body.addEventListener('mouseup', this.mouseup.bind(this));
      this.container.addEventListener('mousemove', this.mousemove.bind(this));
    }

    if (swipeable) {
      this.container.addEventListener('touchstart', this.touchstart.bind(this), { passive: true });
      document.body.addEventListener('touchend', this.touchend.bind(this), { passive: true });
      this.container.addEventListener('touchmove', this.touchmove.bind(this));
    }
  }

  applyStylesToContainer() {
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.cursor = 'wait';
    this.container.setAttribute('draggable', 'false');
    this.container.className = `${this.container.className} initialized`;
  }

  init(container) {
    let {
      folder, filename, imageList, indexZeroBase, amount, draggable = true, swipeable = true, keys, bottomCircle, bottomCircleOffset, boxShadow,
      autoplay, speed, autoplayReverse, fullScreen, magnifier, ratio, responsive, ciToken, ciSize, ciOperation,
      ciFilters, lazyload, lazySelector, spinReverse, dragSpeed, stopAtEdges, controlReverse
    } = get360ViewProps(container);
    const ciParams = { ciSize, ciToken, ciOperation, ciFilters };
    const parent = this.container.parentElement.parentElement;

    this.addInnerBox();

    this.folder = folder;
    this.filename = filename;
    this.imageList = imageList;
    this.indexZeroBase = indexZeroBase;
    this.amount = amount;
    this.bottomCircle = bottomCircle;
    this.bottomCircleOffset = bottomCircleOffset;
    this.boxShadow = boxShadow;
    this.autoplay = autoplay; // && !this.isMobile;
    this.speed = speed;
    this.reversed = autoplayReverse;
    this.fullScreen = fullScreen;
    this.magnifier = !this.isMobile && magnifier ? magnifier : false;
    this.lazyload = lazyload;
    this.ratio = ratio;
    this.spinReverse = spinReverse;
    this.controlReverse = controlReverse;
    this.dragSpeed = dragSpeed;
    this.autoplaySpeed = this.speed * 36 / this.amount;
    this.stopAtEdges = stopAtEdges;
    this.isAutoplayCountingDown = false;
    this.isPlaying = false;
    this.instructions = parent.querySelector( '.figurine-video-instruction' );
    this.frame = parent.querySelector( '.figurine-video-frame-container' );
    this.playerName = parent.dataset.player;

    this.applyStylesToContainer();

    this.addCanvas();

    let src = this.getSrc(responsive, container, folder, filename, ciParams);

    this.preloadImages(amount, src, lazyload, lazySelector, container, responsive, ciParams);

    this.attachEvents(draggable, swipeable);
  }
}

export default CI360Viewer;
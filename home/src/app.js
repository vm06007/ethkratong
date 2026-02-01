// header
(function () {
  const header = $(".header"),
    wrap = header.find(".header-wrap"),
    burger = header.find(".header-burger"),
    close = header.find(".header-close"),
    dropdown = header.find(".header-dropdown"),
    head = header.find(".header-head"),
    body = header.find(".header-body");

  burger.on("click", function () {
    burger.addClass("active");
    wrap.addClass("visible");
  });

  close.on("click", function () {
    burger.removeClass("active");
    wrap.removeClass("visible");
  });

  head.on("click", function (e) {
    e.stopPropagation();
    dropdown.toggleClass("active");
  });

  body.on("click", function (e) {
    e.stopPropagation();
  });

  $("html,body").on("click", function () {
    dropdown.removeClass("active");
  });
})();

// accordion
(function () {
  const accordions = $(".accordion-item");

  accordions.each(function () {
    const accordion = $(this),
      head = accordion.find(".accordion-head"),
      body = accordion.find(".accordion-body");

    head.on("click", function () {
      accordion.toggleClass("active");
      body.slideToggle();
    });
  });
})();

// tabs
(function () {
  const tabs = $(".tabs");
  tabs.each(function () {
    let thisTabs = $(this),
      nav = thisTabs.find(".tabs-button"),
      item = thisTabs.find(".tabs-item");
    nav.on("click", function () {
      let thisNav = $(this),
        indexNav = thisNav.index();
      nav.removeClass("active");
      thisNav.addClass("active");
      item.hide();
      item.eq(indexNav).fadeIn();
    });
  });
})();

// swiper features
let swiperFeatures = new Swiper(".swiper-features", {
  slidesPerView: 1,
  spaceBetween: 0,
  // speed: 500,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2,
    },
    1024: {
      slidesPerView: 3,
    },
  },
});

// scroll
$(document).ready(function () {
  $(document).on("click", ".js-scroll", function (e) {
    const targetHref = $(this).attr("href");

    if (targetHref.startsWith("/#")) {
      e.preventDefault();
      window.location.href = targetHref;
    }
  });

  if (window.location.hash) {
    const target = $(window.location.hash);
    if (target.length) {
      $(window).scrollTop(target.offset().top);
    }
  }
});

// demo modal
(function () {
  const modal = $("#demo-modal");
  const video = modal.find(".demo-modal-video")[0];
  const openBtn = $(".js-play-demo");
  const closeBtn = modal.find(".demo-modal-close");

  function openModal() {
    modal.css("display", "flex").attr("aria-hidden", "false");
    if (video) {
      video.play().catch(function () {});
    }
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    if (video) {
      video.pause();
    }
  }

  openBtn.on("click", function (e) {
    e.preventDefault();
    openModal();
  });

  closeBtn.on("click", closeModal);

  modal.on("click", function (e) {
    if (e.target === modal[0]) {
      closeModal();
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") {
      closeModal();
    }
  });
})();

// feature modal
(function () {
  const modal = $("#feature-modal");
  const openBtn = $(".js-feature-block");
  const closeBtn = modal.find(".feature-modal-close");
  const title = modal.find(".feature-modal-title");
  const description = modal.find(".feature-modal-description");
  const icon = modal.find(".feature-modal-icon");

  function openModal(data) {
    title.text(data.title);
    description.html(data.description);
    // Handle icon path - assuming webpack require or just static path
    // Since we're in JS, we might need to handle the path carefully if it's processed by webpack
    // For now, let's assume the icon path is correctly provided in the data attribute
    // and if it's using require in pug, it will be a processed URL.
    // However, in our pug we used data-icon="clock.svg".
    // We might need to get the src from the image inside the clicked block instead.
    
    if (data.iconSrc) {
      icon.attr("src", data.iconSrc);
    }

    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
  }

  openBtn.on("click", function (e) {
    e.preventDefault();
    const $this = $(this);
    const data = {
      title: $this.data("title"),
      description: $this.data("description"),
      iconSrc: $this.find("img").attr("src")
    };
    openModal(data);
  });

  closeBtn.on("click", closeModal);

  modal.on("click", function (e) {
    if (e.target === modal[0]) {
      closeModal();
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") {
      closeModal();
    }
  });
})();

// aos
AOS.init({
  offset: 120,
  duration: 700,
});

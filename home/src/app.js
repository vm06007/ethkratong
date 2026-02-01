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

// aos
AOS.init({
  offset: 120,
  duration: 700,
});

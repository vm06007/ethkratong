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

  if (head.length) {
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
  }
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

// hero sphere: show play button on hover (reliable across browsers)
(function () {
  $(".hero-sphere").on("mouseenter", function () {
    $(this).addClass("is-hovered");
  }).on("mouseleave", function () {
    $(this).removeClass("is-hovered");
  });
})();

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

// about us modal (developers)
(function () {
  const modal = $("#about-us-modal");
  const openBtn = $(".js-about-us");
  const closeBtn = modal.find(".about-us-modal-close");

  function openModal() {
    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
  }

  openBtn.on("click", function (e) {
    e.preventDefault();
    openModal();
  });

  closeBtn.on("click", closeModal);
  modal.on("click", function (e) {
    if (e.target === modal[0]) closeModal();
  });
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") closeModal();
  });
})();

// about kratong modal
(function () {
  const modal = $("#about-kratong-modal");
  const openBtn = $(".js-about-kratong");
  const closeBtn = modal.find(".about-kratong-modal-close");

  function openModal() {
    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
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

// newsletter form: show "You are subscribed" modal
(function () {
  const form = $("#newsletter-form");
  const modal = $("#newsletter-success-modal");
  const closeBtn = modal.find(".newsletter-success-modal-close");

  function openModal() {
    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
  }

  if (form.length) {
    form.on("submit", function (e) {
      e.preventDefault();
      openModal();
    });
  }

  closeBtn.on("click", closeModal);
  modal.on("click", function (e) {
    if (e.target === modal[0]) closeModal();
  });
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") closeModal();
  });
})();

// legal modal (Terms & Conditions / Privacy Policy)
(function () {
  const modal = $("#legal-modal");
  const titleEl = modal.find(".legal-modal-title");
  const bodyEl = modal.find(".legal-modal-body");
  const openBtns = $(".js-legal-modal");
  const closeBtn = modal.find(".legal-modal-close");

  const content = {
    terms: {
      title: "Terms & Conditions",
      body: "<p>By using ETHKratong you agree to these terms. Do not use the service for anything illegal. We provide the tool as-is; use at your own risk. You are responsible for your transactions and keys.</p><p>We may update these terms; continued use means you accept the changes.</p>"
    },
    privacy: {
      title: "Privacy Policy",
      body: "<p>ETHKratong does not collect or store your personal data for the app experience. Transaction data is on the blockchain. If you subscribe to our newsletter we use your email only to send updates; you can unsubscribe anytime.</p><p>We do not sell your data.</p>"
    }
  };

  function openModal(which) {
    const data = content[which];
    if (data) {
      titleEl.text(data.title);
      bodyEl.html(data.body);
    }
    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
  }

  openBtns.on("click", function (e) {
    e.preventDefault();
    openModal($(this).data("legal"));
  });

  closeBtn.on("click", closeModal);
  modal.on("click", function (e) {
    if (e.target === modal[0]) closeModal();
  });
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") closeModal();
  });
})();

// detail image modal (gallery cards click)
(function () {
  const modal = $("#detail-image-modal");
  const modalImg = $("#detail-image-modal-img");
  const cards = $(".js-detail-image-card");
  const closeBtn = modal.find(".detail-image-modal-close");

  function openModal(src) {
    modalImg.attr("src", src);
    modal.css("display", "flex").attr("aria-hidden", "false");
    $("body").addClass("no-scroll");
  }

  function closeModal() {
    modal.css("display", "none").attr("aria-hidden", "true");
    $("body").removeClass("no-scroll");
  }

  cards.on("click", function (e) {
    e.preventDefault();
    const $card = $(this);
    const img = $card.find("img").first();
    const src = img.length ? img.attr("src") : $card.data("image");
    if (src) openModal(src);
  });

  closeBtn.on("click", closeModal);
  modal.on("click", function (e) {
    if (e.target === modal[0]) closeModal();
  });
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.attr("aria-hidden") === "false") closeModal();
  });
})();

// benefit inline section
(function () {
  const blocks = $(".js-benefit-block");
  const defaultUI = $("#benefit-default-ui");
  const richDisplay = $("#benefit-rich-display");
  const richTitle = $("#benefit-rich-title");
  const richText = $("#benefit-rich-text");
  const richIcon = $("#benefit-rich-icon");

  blocks.on("click", function () {
    const $this = $(this);
    const title = $this.data("title");
    const description = $this.data("description");
    const iconSrc = $this.find("img").attr("src");

    // UI Feedback: Highlighting buttons
    blocks.removeClass("active bg-white/10 shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.10)_inset]");
    $this.addClass("active bg-white/10 shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.10)_inset]");

    // Update Content with animation
    defaultUI.css("opacity", "0");
    
    richDisplay.removeClass("pointer-events-none").css({
      "opacity": "0",
      "transform": "translateY(1rem)"
    });

    setTimeout(() => {
      richTitle.text(title);
      richText.text(description);
      richIcon.attr("src", iconSrc);
      
      richDisplay.css({
        "opacity": "1",
        "transform": "translateY(0)"
      });
    }, 300);
  });
})();

// aos
AOS.init({
  offset: 120,
  duration: 700,
});

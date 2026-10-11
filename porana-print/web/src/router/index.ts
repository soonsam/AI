import { createRouter, createWebHistory } from "vue-router";
import { watch } from "vue";
import { useAuthStore } from "../stores/authStore";
import Home from "../views/Home.vue";
import GraphicDesign from "../views/GraphicDesign.vue";
import BusinessCards from "../views/BusinessCards.vue";
import NvidiaCards from "../views/NvidiaCards.vue";
import Cart from "../views/Cart.vue";
import Success from "../views/Success.vue";
import GeneralPrinting from "../views/GeneralPrinting.vue";
import PlanPrinting from "../views/PlanPrinting.vue";
import Posters from "../views/Posters.vue";
import FootpathSign from "../views/FootpathSign.vue";
import AFrameSigns from "../views/AFrameSigns.vue";
import DigitalPrinting from "../views/DigitalPrinting.vue";
import BannerSigns from "../views/BannerSigns.vue";
import FlagSigns from "../views/FlagSigns.vue";
import VehicleGraphics from "../views/VehicleGraphics.vue";
import SignHolders from "../views/SignHolders.vue";
import PassportPhotos from "../views/PassportPhotos.vue";
import CanvasPrinting from "../views/CanvasPrinting.vue";
import TrodatStamps from "../views/TrodatStamps.vue";
import ConvertBookToPdf from "../views/ConvertBookToPdf.vue";
import ACMSigns from "../views/ACMSigns.vue";
import PullUpBanner from "../views/PullUpBanner.vue";
import PhotoPrints from "../views/PhotoPrints.vue";
import NotFound from "../views/NotFound.vue";
import LabelPrinting from "../views/LabelPrinting.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Account from "../views/Account.vue";

const routes = [
  { path: "/", component: Home },
  {
    path: "/graphic-design",
    component: GraphicDesign,
  },
  {
    path: "/business-cards",
    component: BusinessCards,
  },
  {
    path: "/nvidia-cards",
    component: NvidiaCards,
  },
  {
    path: "/general-printing",
    component: GeneralPrinting,
  },
  {
    path: "/plan-printing",
    component: PlanPrinting,
  },
  {
    path: "/posters",
    component: Posters,
  },
  {
    path: "/passport-photos",
    component: PassportPhotos,
  },
  {
    path: "/footpath-signs",
    component: FootpathSign,
  },
  {
    path: "/a-frame-signs",
    component: AFrameSigns,
  },
  {
    path: "/digital-printing",
    component: DigitalPrinting,
  },
  {
    path: "/banner-signs",
    component: BannerSigns,
  },
  {
    path: "/flag-signs",
    component: FlagSigns,
  },
  {
    path: "/vehicle-graphics",
    component: VehicleGraphics,
  },
  {
    path: "/sign-holders",
    component: SignHolders,
  },
  {
    path: "/canvas-printing",
    component: CanvasPrinting,
  },
  {
    path: "/trodat-stamps",
    component: TrodatStamps,
  },
  {
    path: "/convert-book-to-pdf",
    component: ConvertBookToPdf,
  },
  {
    path: "/acm-signs",
    component: ACMSigns,
  },
  {
    path: "/photo-prints",
    component: PhotoPrints,
  },
  {
    path: "/cart",
    component: Cart,
  },
  {
    path: "/success",
    component: Success,
  },
  {
    path: "/pull-up-banners",
    component: PullUpBanner,
  },
  {
    path: "/label-printing",
    component: LabelPrinting,
  },
   {
    path: "/terms-and-conditions",
    component: () => import("../views/TermsAndConditions.vue"),
  },
  {
    path: "/shipping-and-returns",
    component: () => import("../views/ShippingAndReturns.vue"),
  },
{
    path: "/opening-hours",
    component: () => import("../views/OpeningHours.vue"),
  },
  {
    path: "/login",
    component: Login,
  },
  {
    path: "/register",
    component: Register,
  },
  {
    path: "/account",
    component: Account,
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    // always scroll to top
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => auth.ready,
        (ready) => {
          if (ready) {
            stop();
            resolve();
          }
        },
        { immediate: true }
      );
    });
  }
  if (to.meta.requiresAuth && !auth.user) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if ((to.path === "/login" || to.path === "/register") && auth.user) {
    const redirect =
      typeof to.query.redirect === "string" ? to.query.redirect : "/account";
    return { path: redirect };
  }
});

export default router;

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Chip,
  Drawer,
  Input,
  InputWrapper,
  Menu,
  Modal,
  SegmentedControl,
  Switch,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import classes from "./mantine.module.css";
import { sizes } from "./tokens";

const touchMin = "var(--bs-touch-min)";

const overlay = { backgroundOpacity: 1, color: "var(--bs-scrim)", blur: 0 };

const closeButton = { size: sizes["touch-min"], iconSize: 24 };

export const components = {
  Button: Button.extend({
    defaultProps: { variant: "default" },
    classNames: { root: classes.button, label: classes.buttonLabel },
    vars: () => ({
      root: {
        "--button-height": touchMin,
        "--button-padding-x": "var(--bs-space-lg)",
        "--button-fz": "var(--mantine-font-size-md)",
      },
    }),
  }),
  ActionIcon: ActionIcon.extend({
    defaultProps: { variant: "subtle" },
    vars: () => ({ root: { "--ai-size": touchMin } }),
  }),
  Input: Input.extend({
    classNames: { input: classes.input, section: classes.inputSection },
    vars: () => ({
      wrapper: { "--input-height": touchMin, "--input-fz": "var(--mantine-font-size-md)" },
    }),
  }),
  InputWrapper: InputWrapper.extend({
    classNames: { label: classes.inputLabel, error: classes.inputError },
  }),
  Checkbox: Checkbox.extend({
    classNames: {
      body: classes.checkboxBody,
      input: classes.checkboxInput,
      label: classes.controlLabel,
    },
    vars: () => ({
      root: { "--checkbox-size": "28px", "--checkbox-radius": "var(--bs-radius-sm)" },
    }),
  }),
  Switch: Switch.extend({
    defaultProps: { radius: "sm" },
    classNames: { body: classes.checkboxBody, label: classes.controlLabel },
  }),
  SegmentedControl: SegmentedControl.extend({
    vars: () => ({ root: { "--sc-color": "var(--bs-inverse)" } }),
    classNames: {
      root: classes.segmented,
      indicator: classes.segmentedIndicator,
      label: classes.segmentedLabel,
    },
  }),
  Chip: Chip.extend({
    defaultProps: { variant: "outline", radius: "md" },
    classNames: { label: classes.chip, iconWrapper: classes.chipIcon },
  }),
  Badge: Badge.extend({
    defaultProps: { variant: "outline" },
    classNames: { root: classes.tag },
  }),
  Menu: Menu.extend({
    defaultProps: { shadow: "md" },
    classNames: { dropdown: classes.menu, item: classes.menuItem, divider: classes.menuDivider },
  }),
  Modal: Modal.extend({
    defaultProps: {
      radius: "lg",
      shadow: "md",
      padding: "xl",
      overlayProps: overlay,
      closeButtonProps: closeButton,
    },
    classNames: {
      header: classes.overlayHeader,
      title: classes.overlayTitle,
      content: classes.overlayContent,
      body: classes.overlayBody,
      close: classes.overlayClose,
    },
  }),
  Drawer: Drawer.extend({
    defaultProps: {
      radius: "lg",
      shadow: "md",
      padding: "lg",
      overlayProps: overlay,
      closeButtonProps: closeButton,
    },
    classNames: {
      header: classes.overlayHeader,
      title: classes.overlayTitle,
      content: classes.overlayContent,
      body: classes.overlayBody,
      close: classes.overlayClose,
    },
  }),
  Notifications: Notifications.extend({
    defaultProps: { position: "bottom-left", limit: 1, autoClose: 6000 },
    classNames: { root: classes.toasts },
  }),
};

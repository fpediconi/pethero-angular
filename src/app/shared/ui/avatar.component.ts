import { Component, Input, computed } from "@angular/core";

@Component({
  selector: "app-avatar",
  standalone: true,
  templateUrl: "./avatar.component.html",
  styleUrls: ["./avatar.component.css"],
})
export class AvatarComponent {
  @Input() src: string | null | undefined;
  @Input() name: string | null | undefined;
  @Input() size: "sm" | "md" | "lg" = "sm";

  srcClean = computed(() => (this.src || "").trim());
  altText = computed(() => `Avatar de ${this.name || "usuario"}`);
  initials = computed(() => {
    const name = (this.name || "").trim();
    if (!name) return "PH";
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  });
}

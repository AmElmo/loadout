import type { SkillItem, GroupedSkill } from "@/types";
import { ALL_TOOLS } from "@/config/tools";

/**
 * Groups SkillItems by name + scope into GroupedSkill[].
 * Picks the primary variant by preferring the canonical (non-symlinked) source,
 * then falling back to first by ALL_TOOLS display order.
 */
export function groupSkills(skills: SkillItem[]): GroupedSkill[] {
  const map = new Map<string, SkillItem[]>();

  for (const skill of skills) {
    const key = `${skill.name}::${skill.scope}`;
    const group = map.get(key);
    if (group) {
      group.push(skill);
    } else {
      map.set(key, [skill]);
    }
  }

  const groups: GroupedSkill[] = [];

  for (const [groupKey, variants] of map) {
    // Sort variants by ALL_TOOLS order for deterministic output
    variants.sort(
      (a, b) =>
        ALL_TOOLS.indexOf(a.sourceTool) - ALL_TOOLS.indexOf(b.sourceTool)
    );

    // Pick primary: prefer non-symlinked (canonical source), then first by tool order
    const primary =
      variants.find((v) => !v.isSymlinked) ?? variants[0];

    // Detect content drift: any variant has different content than the primary
    const hasContentDrift = variants.some(
      (v) => v.content !== primary.content
    );

    const installedTools = variants.map((v) => v.sourceTool);

    groups.push({
      groupKey,
      name: primary.name,
      description: primary.description,
      scope: primary.scope,
      maturity: primary.maturity,
      installedTools,
      primary,
      variants,
      hasContentDrift,
    });
  }

  return groups;
}

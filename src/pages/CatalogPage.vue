<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Package,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalog, type CatalogNode } from "@/composables/useCatalog";
import { useRegistry } from "@/composables/useRegistry";

const router = useRouter();
const { tree, repoCount, loading, error, fetchCatalog, toggleNode } =
  useCatalog();
const { registryUrl } = useRegistry();

function handleToggle(node: CatalogNode) {
  if (node.isRepo && node.children.length === 0) {
    router.push({ name: "taglist", params: { image: node.path } });
  } else {
    toggleNode(node);
  }
}

function goToImage(path: string) {
  router.push({ name: "taglist", params: { image: path } });
}

onMounted(() => {
  fetchCatalog();
});
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div
      v-if="loading || repoCount > 0"
      class="flex items-center justify-between"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Images</h1>
        <p class="text-muted-foreground">
          <span v-if="!loading">{{ repoCount }} images found</span>
          <span v-else>Loading...</span>
        </p>
      </div>
      <Badge variant="secondary" class="text-xs">
        {{ registryUrl }}
      </Badge>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 8" :key="i" class="h-12 w-full" />
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive text-lg">{{ error }}</p>
    </div>

    <Card v-else class="p-0 overflow-hidden">
      <CardContent class="p-0">
        <div class="divide-y">
          <template v-for="node in tree" :key="node.path">
            <CatalogNodeItem
              :node="node"
              :depth="0"
              @select="goToImage"
              @toggle="handleToggle"
            />
          </template>
          <div
            v-if="tree.length === 0"
            class="p-8 text-center text-muted-foreground"
          >
            No repositories match your search.
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script lang="ts">
import { defineComponent, h } from "vue";
import type { PropType } from "vue";

const CatalogNodeItem = defineComponent({
  name: "CatalogNodeItem",
  props: {
    node: { type: Object as PropType<CatalogNode>, required: true },
    depth: { type: Number, default: 0 },
  },
  emits: ["select", "toggle"],
  setup(props, { emit }) {
    return () => {
      const node = props.node;
      const hasChildren = node.children.length > 0;
      const paddingLeft = `${props.depth * 1.5 + 0.75}rem`;

      const children: any[] = [];

      children.push(
        h(
          "div",
          {
            class:
              "flex items-center gap-2 py-3 px-4 hover:bg-accent/50 cursor-pointer transition-colors",
            style: { paddingLeft },
            onClick: () => {
              if (node.isRepo && !hasChildren) {
                emit("select", node.path);
              } else {
                emit("toggle", node);
              }
            },
          },
          [
            hasChildren
              ? h(node.expanded ? ChevronDown : ChevronRight, {
                  class: "h-4 w-4 shrink-0 text-muted-foreground",
                })
              : h("div", { class: "w-4" }),
            h(hasChildren ? (node.expanded ? FolderOpen : Folder) : Package, {
              class: `h-4 w-4 shrink-0 ${hasChildren ? "text-muted-foreground" : "text-primary"}`,
            }),
            h(
              "span",
              {
                class: `text-sm ${node.isRepo ? "font-medium" : "text-muted-foreground"}`,
              },
              node.name,
            ),
            node.isRepo && node.latestTag
              ? h(
                  "span",
                  { class: `text-xs text-muted-foreground ${!hasChildren ? "ml-auto" : ""}` },
                  `:${node.latestTag}`,
                )
              : null,
            node.isRepo && hasChildren
              ? h(
                  "span",
                  {
                    class: `text-xs text-primary hover:underline ${!node.latestTag ? "ml-auto" : "ml-2"}`,
                    onClick: (e: Event) => {
                      e.stopPropagation();
                      emit("select", node.path);
                    },
                  },
                  "View tags \u2192",
                )
              : null,
          ],
        ),
      );

      if (hasChildren && node.expanded) {
        for (const child of node.children) {
          children.push(
            h(CatalogNodeItem, {
              node: child,
              depth: props.depth + 1,
              onSelect: (path: string) => emit("select", path),
              onToggle: (n: CatalogNode) => emit("toggle", n),
            }),
          );
        }
      }

      return h("div", children);
    };
  },
});

export { CatalogNodeItem };
</script>

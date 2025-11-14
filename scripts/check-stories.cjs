#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "../src");
const errors = [];

// Find all "components" directories and their direct component files recursively
function findComponentDirectories(dir, componentsFound = new Map()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check if this directory is named "components"
      if (entry.name === "components") {
        // Scan only the direct files in this components directory
        const componentFiles = fs.readdirSync(fullPath, {
          withFileTypes: true,
        });

        for (const file of componentFiles) {
          if (file.isFile()) {
            const ext = path.extname(file.name);
            const basename = path.basename(file.name, ext);

            // Only check component files (tsx/jsx), exclude stories, tests, and index files
            if (
              (ext === ".tsx" || ext === ".jsx") &&
              !file.name.includes(".stories.") &&
              !file.name.includes(".test.") &&
              !file.name.includes(".spec.") &&
              basename !== "index"
            ) {
              if (!componentsFound.has(fullPath)) {
                componentsFound.set(fullPath, []);
              }

              componentsFound.get(fullPath).push({
                name: basename,
                fullPath: path.join(fullPath, file.name),
                ext: ext,
              });
            }
          }
        }
      }

      // Recursively search subdirectories for nested "components" folders
      findComponentDirectories(fullPath, componentsFound);
    }
  }

  return componentsFound;
}

// Check if a story file exists for a component in the stories subdirectory
function hasStoryFile(componentDir, componentName) {
  const storiesDir = path.join(componentDir, 'stories');
  if (!fs.existsSync(storiesDir)) return false;

  const possibleStoryFiles = [
    `${componentName}.stories.tsx`,
    `${componentName}.stories.ts`,
    `${componentName}.stories.jsx`,
    `${componentName}.stories.js`,
  ];

  for (const storyFile of possibleStoryFiles) {
    const storyPath = path.join(storiesDir, storyFile);
    if (fs.existsSync(storyPath)) {
      return true;
    }
  }

  return false;
}

// Main check function
function checkStories() {
  console.log("🔍 Checking for missing story files...\n");

  const componentDirs = findComponentDirectories(srcDir);

  if (componentDirs.size === 0) {
    console.log("⚠️  No component files found in src directory.");
    return true;
  }

  let totalComponents = 0;
  let missingStories = 0;

  for (const [dir, components] of componentDirs) {
    const relativePath = path.relative(srcDir, dir);

    for (const component of components) {
      totalComponents++;

      if (!hasStoryFile(dir, component.name)) {
        missingStories++;
        const componentPath = path.relative(process.cwd(), component.fullPath);
        errors.push(`❌ Missing story for: ${componentPath}`);
        console.log(`❌ Missing story for: ${componentPath}`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total components: ${totalComponents}`);
  console.log(`   Missing stories: ${missingStories}`);

  if (missingStories > 0) {
    console.log(
      "\n❌ Story check failed! Please create story files for all components.",
    );
    console.log("\nExpected story file naming convention:");
    console.log("   ComponentName.stories.tsx (or .ts, .jsx, .js)");
    return false;
  }

  console.log("\n✅ All components have story files!");
  return true;
}

// Run the check
const passed = checkStories();
process.exit(passed ? 0 : 1);

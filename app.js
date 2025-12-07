// app.js - loads data.json + label_mappings.json and provides UI logic
let DATA = null;
let STATS = null;
let LABEL_MAPPINGS = null;

// Map UI/data field names to keys inside label_mappings.json
const FIELD_TO_MAPPING_KEY = {
  Manufacturer: 'Manufacturer',
  Model: 'Model',
  Category: 'Category',
  'Fuel Type': 'Fuel type',
  'Gearbox Type': 'Gear box type',
  'Drive Wheels': 'Drive wheels',
  Doors: 'Doors',
  Wheel: 'Wheel',
  Color: 'Color'
};

// Load both dataset and label mappings
async function loadData() {
  try {
    const [dataRes, labelsRes] = await Promise.all([
      fetch('data.json'),
      fetch('label_mappings.json')
    ]);

    DATA = await dataRes.json();
    LABEL_MAPPINGS = await labelsRes.json();

    STATS = {
      totalCars: DATA.rows.length,
      manufacturers: DATA.unique.Manufacturer.length,
      models: DATA.unique.Model.length,
      minPrice: Math.min(...DATA.rows.map(r => r.predicted_price)),
      maxPrice: Math.max(...DATA.rows.map(r => r.predicted_price))
    };

    updateStats();
    populateControls();
  } catch (error) {
    console.error('Error loading data or label mappings:', error);
    const priceEl = document.getElementById('price');
    if (priceEl) {
      priceEl.innerText = 'Error loading data';
    }
  }
}

function updateStats() {
  const statsEl = document.getElementById('stats');
  if (statsEl && STATS && DATA) {
    const avgPrice =
      DATA.rows.reduce((sum, r) => sum + r.predicted_price, 0) /
      STATS.totalCars;

    statsEl.innerHTML =
      `Dataset: ${STATS.totalCars} cars, ` +
      `${STATS.manufacturers} manufacturers, ` +
      `${STATS.models} models | Price range: ` +
      `$${STATS.minPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} - ` +
      `$${STATS.maxPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}

/**
 * Convert a coded value (e.g. "Manufacturer 22", "Fuel 5", 0 for Doors)
 * into a human-readable label using label_mappings.json.
 * The underlying value we store in the <option value="..."> stays as the
 * original code; only the visible text is changed.
 */
function codeToLabel(fieldName, rawValue) {
  if (!LABEL_MAPPINGS) return rawValue;

  const mappingKey = FIELD_TO_MAPPING_KEY[fieldName];
  if (!mappingKey) return rawValue;

  const mapping = LABEL_MAPPINGS[mappingKey];
  if (!mapping) return rawValue;

  let code = null;

  if (typeof rawValue === 'string') {
    // Expect patterns like "Manufacturer 22", "Fuel 5", "Category 3", "Wheel 0", "Color 14"
    const match = rawValue.match(/(\d+)$/);
    if (!match) return rawValue;
    code = parseInt(match[1], 10);
  } else if (typeof rawValue === 'number') {
    // For numeric-coded fields like Doors, Airbags, etc.
    code = rawValue;
  } else {
    return rawValue;
  }

  // Find label where mapping[label] === code
  const entry = Object.entries(mapping).find(([, idx]) => idx === code);
  return entry ? entry[0] : rawValue;
}

/**
 * Populate a <select> with options.
 * - id: DOM id of the select
 * - items: array of original coded values from DATA.unique
 * - fieldName: corresponding DATA field name (used to find mapping)
 */
function populateSelect(id, items, fieldName) {
  const sel = document.getElementById(id);
  if (!sel) return;

  let options = '<option value="">Select...</option>';

  options += items
    .map(i => {
      const label = fieldName ? codeToLabel(fieldName, i) : i;
      // Keep the original code as the value; show decoded label as text
      return `<option value="${i}">${label}</option>`;
    })
    .join('\n');

  sel.innerHTML = options;
}

function populateControls() {
  const u = DATA.unique;

  // Use mappings for all coded dropdowns
  populateSelect('Manufacturer', u.Manufacturer, 'Manufacturer');
  populateSelect('Model', u.Model, 'Model');
  populateSelect('Production_Year', u['Production Year']); // plain years, no mapping
  populateSelect('Category', u.Category, 'Category');
  populateSelect('Fuel_Type', u['Fuel Type'], 'Fuel Type');
  populateSelect('Gearbox_Type', u['Gearbox Type'], 'Gearbox Type');
  populateSelect('Drive_Wheels', u['Drive Wheels'], 'Drive Wheels');
  populateSelect('Doors', u.Doors, 'Doors');
  populateSelect('Wheel', u.Wheel, 'Wheel');
  // Airbags is numeric count with no label mapping provided; leave as-is
  populateSelect('Airbags', u.Airbags);

  // Update leather interior label
  const leatherCheckbox = document.getElementById('Leather_Interior');
  const leatherLabel = document.getElementById('leather-label');
  if (leatherCheckbox && leatherLabel) {
    leatherCheckbox.addEventListener('change', function () {
      leatherLabel.textContent = this.checked ? 'Yes' : 'No';
    });
  }

  const predictBtn = document.getElementById('predict-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (predictBtn) {
    predictBtn.addEventListener('click', onPredict);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      location.reload();
    });
  }

  // Add some sample data presets
  addSamplePresets();
}

function addSamplePresets() {
  const actions = document.querySelector('.actions');
  if (!actions) return;

  const presetBtn = document.createElement('button');
  presetBtn.id = 'sample-btn';
  presetBtn.type = 'button';
  presetBtn.className = 'btn btn-secondary';
  presetBtn.innerHTML = '<i class="fas fa-magic"></i> Load Sample';
  presetBtn.addEventListener('click', loadSampleData);
  actions.appendChild(presetBtn);
}

function loadSampleData() {
  // Find a sample car from the dataset
  const sample = DATA.rows[Math.floor(Math.random() * DATA.rows.length)];

  document.getElementById('Manufacturer').value = sample.Manufacturer;
  document.getElementById('Model').value = sample.Model;
  document.getElementById('Production_Year').value = sample['Production Year'];
  document.getElementById('Category').value = sample.Category;
  document.getElementById('Leather_Interior').checked = sample['Leather Interior'];
  document.getElementById('leather-label').textContent = sample['Leather Interior'] ? 'Yes' : 'No';
  document.getElementById('Fuel_Type').value = sample['Fuel Type'];
  document.getElementById('Engine_Volume').value = sample['Engine Volume'];
  document.getElementById('Mileage').value = sample.Mileage;
  document.getElementById('Gearbox_Type').value = sample['Gearbox Type'];
  document.getElementById('Drive_Wheels').value = sample['Drive Wheels'];
  document.getElementById('Doors').value = sample.Doors;
  document.getElementById('Wheel').value = sample.Wheel;
  document.getElementById('Airbags').value = sample.Airbags;

  // Show a toast notification
  showToast('Sample car data loaded! Click "Predict Price" to see the result.');
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function onPredict() {
  const q = {
    Manufacturer: document.getElementById('Manufacturer').value,
    Model: document.getElementById('Model').value,
    Production_Year: parseInt(document.getElementById('Production_Year').value, 10),
    Category: document.getElementById('Category').value,
    'Leather Interior': document.getElementById('Leather_Interior').checked,
    'Fuel Type': document.getElementById('Fuel_Type').value,
    'Engine Volume': parseFloat(document.getElementById('Engine_Volume').value) || 0,
    'Mileage': parseInt(document.getElementById('Mileage').value, 10) || 0,
    'Gearbox Type': document.getElementById('Gearbox_Type').value,
    'Drive Wheels': document.getElementById('Drive_Wheels').value,
    'Doors': parseInt(document.getElementById('Doors').value, 10),
    'Wheel': document.getElementById('Wheel').value,
    'Airbags': parseInt(document.getElementById('Airbags').value, 10)
  };

  // Validate required fields
  if (!q.Manufacturer || !q.Model || !q.Production_Year) {
    showToast('Please fill in at least Manufacturer, Model, and Production Year');
    return;
  }

  const rows = DATA.rows;

  // Try exact match first
  let bestScore = 0; // 0 means "exact" when we find it directly
  let match = rows.find(r =>
    r.Manufacturer === q.Manufacturer &&
    r.Model === q.Model &&
    r['Production Year'] === q['Production_Year'] &&
    r.Category === q.Category &&
    r['Leather Interior'] === q['Leather Interior'] &&
    r['Fuel Type'] === q['Fuel Type'] &&
    r['Gearbox Type'] === q['Gearbox Type'] &&
    r['Drive Wheels'] === q['Drive Wheels'] &&
    r.Doors === q.Doors &&
    r.Wheel === q.Wheel &&
    r.Airbags === q.Airbags &&
    Math.abs(r['Engine Volume'] - q['Engine Volume']) < 0.001 &&
    r.Mileage === q.Mileage
  );

  if (!match) {
    // Find nearest match using weighted scoring
    let best = null;
    bestScore = Infinity;

    for (const r of rows) {
      let score = 0;

      // Categorical mismatches (higher penalty)
      if (r.Manufacturer !== q.Manufacturer) score += 5;
      if (r.Model !== q.Model) score += 5;
      if (r.Category !== q.Category) score += 3;
      if (r['Fuel Type'] !== q['Fuel Type']) score += 3;
      if (r['Gearbox Type'] !== q['Gearbox Type']) score += 2;
      if (r['Drive Wheels'] !== q['Drive Wheels']) score += 2;
      if (r['Leather Interior'] !== q['Leather Interior']) score += 1;

      // Numerical differences (normalized)
      const engineVolWeight = 2;
      const mileageWeight = 1;
      const yearWeight = 3;
      const airbagsWeight = 1;

      const engineDiff =
        Math.abs(r['Engine Volume'] - q['Engine Volume']) /
        (q['Engine Volume'] || 1);
      const mileageDiff =
        Math.abs(r.Mileage - q.Mileage) /
        (q.Mileage || 1);
      const yearDiff =
        Math.abs(r['Production Year'] - q['Production_Year']) / 10;
      const airbagsDiff =
        Math.abs(r.Airbags - q.Airbags) /
        (q.Airbags || 1);

      score +=
        engineDiff * engineVolWeight +
        mileageDiff * mileageWeight +
        yearDiff * yearWeight +
        airbagsDiff * airbagsWeight;

      if (score < bestScore) {
        bestScore = score;
        best = r;
      }
    }

    match = best;
  }

  if (match) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(match.predicted_price);

    document.getElementById('price').innerHTML =
      `<span class="price-value">${formattedPrice}</span>`;

    document.getElementById('explain').innerHTML =
      bestScore > 0
        ? `<i class="fas fa-search"></i> Nearest match from dataset (similar car)`
        : `<i class="fas fa-check-circle"></i> Exact match found in dataset`;

    // Add match details (these will still show coded values unless you also map them)
    const details = document.querySelector('.details');
    if (details) {
      details.innerHTML = `
        <p><i class="fas fa-info-circle"></i> Match details:</p>
        <ul>
          <li>Manufacturer: ${match.Manufacturer}</li>
          <li>Model: ${match.Model}</li>
          <li>Year: ${match['Production Year']}</li>
          <li>Engine: ${match['Engine Volume']}L</li>
          <li>Mileage: ${match.Mileage.toLocaleString()} km</li>
        </ul>
      `;
    }

    showToast('Price prediction generated!');
  } else {
    document.getElementById('price').innerText = 'No match found';
    document.getElementById('explain').innerText = 'Try adjusting your search criteria';
  }
}

// Initialize
loadData();

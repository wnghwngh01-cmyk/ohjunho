import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('index.html'),db=read('js/db.js'),ui=read('js/workout-ui.js'),sql=read('supabase/step24_workout_records.sql');
for(const token of ['data-page="workout"','data-workout-tab="exercise"','data-workout-tab="protein"','id="proteinDate"','id="workoutSections"'])if(!html.includes(token))throw new Error('Missing workout UI: '+token);
for(const token of ['listWorkout','saveWorkoutExercise','listProtein','addProtein','deleteProtein'])if(!db.includes(token))throw new Error('Missing workout DB method: '+token);
for(const token of ['workout_sections','workout_exercises','workout_sets','workout_snapshots','protein_logs','enable row level security','save_workout_exercise'])if(!sql.includes(token))throw new Error('Missing workout migration: '+token);
if(!ui.includes('data-add-set')||!ui.includes('data-show-history')||!ui.includes('moveDay(-1)')||!ui.includes('moveDay(1)'))throw new Error('Missing workout interaction');
console.log('workout contract: PASS');

// A proof search: a cursor walks the trunk and probes every branch. Lemmas that
// get used light up and their names type out; dead ends fade. At the end a pulse
// runs back to the root and the goal is proved. Your own names work too.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

tree = proofSpine.show(p5, {
  mode: 'search',
  color: '#ffb347',
  goal: 'everything_is_fine',
  labels: ['coffee_first', 'read_the_docs', 'small_steps', 'ask_a_friend', 'try_again',
    'sleep_on_it', 'draw_a_picture', 'simplify', 'invert_the_problem', 'check_the_edges',
    'work_backwards', 'find_a_pattern', 'name_the_thing', 'go_for_a_walk'],
  duration: 20
})

src(s0).out()

// try: tree.set({ shape: 'river' }), tree.set({ labels: 30 }), tree.set({ goal: 'qed' })
